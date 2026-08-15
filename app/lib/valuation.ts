import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { AI_RESEARCH_CONTRIBUTOR, CONFIDENCE_MAP, computeContributorStats, fmtB } from './lumen';

export type EvidenceRow = {
  id: string;
  category: string;
  description: string;
  value: string | null;
  source_type: string;
  source_label: string;
  date: string;
};

// Extracts a single dollar figure from an evidence item's free text, in
// billions of USD. `subject` tells the model which figure to pull out (e.g.
// "the resulting company valuation" vs. "the annualized revenue figure").
// Returns null if the model can't confidently extract one or the API call
// fails; callers should leave the existing figure untouched in that case.
async function extractBillionsFigure(subject: string, description: string, value: string | null): Promise<number | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Extract ${subject}, in billions of USD as a plain number.

Event: ${description}${value ? ` (${value})` : ''}

Respond with ONLY JSON, no markdown, no prose: {"valueBillions": number or null}`,
        },
      ],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) return null;

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return typeof parsed.valueBillions === 'number' ? parsed.valueBillions : null;
  } catch {
    return null;
  }
}

function extractValuationBillions(description: string, value: string | null) {
  return extractBillionsFigure(
    'the total company valuation implied by this event (not the amount raised — the resulting company valuation)',
    description,
    value
  );
}

export function extractRevenueBillions(description: string, value: string | null) {
  return extractBillionsFigure(
    'the annualized revenue figure mentioned in this event (not funding raised, not a valuation — the actual revenue or ARR number)',
    description,
    value
  );
}

function highestTier(items: EvidenceRow[]): EvidenceRow {
  return items.reduce((best, e) => {
    const bestConf = CONFIDENCE_MAP[best.source_type] ?? 0;
    const eConf = CONFIDENCE_MAP[e.source_type] ?? 0;
    if (eConf !== bestConf) return eConf > bestConf ? e : best;
    return e.date > best.date ? e : best;
  });
}

// Groups same-category evidence into rough "same underlying event" clusters
// by temporal proximity, since evidence rows don't carry an explicit event
// id. Two items within `windowDays` of each other are treated as plausibly
// describing the same event (e.g. a funding round reported by three outlets
// within a couple weeks of each other).
function clusterByProximity(items: EvidenceRow[], windowDays = 45): EvidenceRow[][] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const clusters: EvidenceRow[][] = [];
  for (const item of sorted) {
    const last = clusters[clusters.length - 1];
    const lastMaxDate = last?.reduce((max, e) => (e.date > max ? e.date : max), last[0].date);
    const gapDays = last ? (new Date(item.date).getTime() - new Date(lastMaxDate!).getTime()) / 86_400_000 : Infinity;
    if (last && gapDays <= windowDays) {
      last.push(item);
    } else {
      clusters.push([item]);
    }
  }
  return clusters;
}

const CORROBORATION_MIN_CONFIDENCE = 75;

// Picks the item from the highest credibility tier (SEC filing beats a
// blog post regardless of which is newer); within the same tier, the most
// recent event date wins. Exception: if a *more recent* event is
// independently corroborated by two or more distinct sources -- and at
// least one of them clears a real credibility bar, not just two low-grade
// tips -- that corroborated event outranks an older single-source item even
// from a nominally higher tier. Independent corroboration of a newer event
// is itself a stronger signal than one uncorroborated older filing, and a
// bare tier label on its own can't capture that.
export function pickMostCredible(evidence: EvidenceRow[], category: string): EvidenceRow | null {
  const matches = evidence.filter((e) => e.category === category);
  if (matches.length === 0) return null;

  const tierWinner = highestTier(matches);

  let corroboratedWinner: EvidenceRow | null = null;
  for (const cluster of clusterByProximity(matches)) {
    const distinctSources = new Set(cluster.map((e) => e.source_label));
    const hasCredibleAnchor = cluster.some((e) => (CONFIDENCE_MAP[e.source_type] ?? 0) >= CORROBORATION_MIN_CONFIDENCE);
    if (distinctSources.size < 2 || !hasCredibleAnchor) continue;

    const clusterBest = highestTier(cluster);
    if (clusterBest.date <= tierWinner.date) continue;
    if (!corroboratedWinner || clusterBest.date > corroboratedWinner.date) {
      corroboratedWinner = clusterBest;
    }
  }

  return corroboratedWinner || tierWinner;
}

// Called right after a company is created and freshly researched. Picks the
// most credible Funding / Secondary market item found and uses it to
// populate Last round / Secondary implied immediately — grounded in a real,
// specific citation rather than a blind guess, but marked unconfirmed since
// no human has reviewed it yet.
export async function applyBestUnconfirmedFigures(supabase: SupabaseClient, companyId: string, evidence: EvidenceRow[]) {
  const patch: Record<string, unknown> = {};

  const funding = pickMostCredible(evidence, 'Funding');
  if (funding) {
    const val = await extractValuationBillions(funding.description, funding.value);
    if (val !== null) {
      patch.last_round_value = val;
      patch.last_round_date = funding.date;
      patch.last_round_confirmed = false;
    }
  }

  const secondary = pickMostCredible(evidence, 'Secondary market');
  if (secondary) {
    const val = await extractValuationBillions(secondary.description, secondary.value);
    if (val !== null) {
      patch.secondary_value = val;
      patch.secondary_date = secondary.date;
      patch.secondary_confirmed = false;
    }
  }

  if (Object.keys(patch).length === 0) return;

  await supabase.from('lumen_companies').update(patch).eq('id', companyId);
}

// Called when a Funding / Secondary market evidence item is confirmed by a
// human. That confirmed figure always wins over an unconfirmed one; among
// confirmed figures, only a more recent event date overwrites the existing
// one, so an older confirmation can't clobber a newer one confirmed earlier.
export async function applyConfirmedFigure(supabase: SupabaseClient, companyId: string, evidence: EvidenceRow) {
  if (evidence.category !== 'Funding' && evidence.category !== 'Secondary market') return;

  const { data: company, error } = await supabase
    .from('lumen_companies')
    .select('last_round_date, last_round_confirmed, secondary_date, secondary_confirmed')
    .eq('id', companyId)
    .single();
  if (error || !company) return;

  const isFunding = evidence.category === 'Funding';
  const currentlyConfirmed = isFunding ? company.last_round_confirmed : company.secondary_confirmed;
  const currentDate = isFunding ? company.last_round_date : company.secondary_date;

  if (currentlyConfirmed && currentDate && currentDate > evidence.date) return;

  const val = await extractValuationBillions(evidence.description, evidence.value);
  if (val === null) return;

  const patch = isFunding
    ? { last_round_value: val, last_round_date: evidence.date, last_round_confirmed: true }
    : { secondary_value: val, secondary_date: evidence.date, secondary_confirmed: true };

  await supabase.from('lumen_companies').update(patch).eq('id', companyId);
}

// Generates a bear/base/bull valuation from a company's evidence and saves
// it. Includes not just confirmed evidence but also not-yet-confirmed
// findings from the AI research bot (never unconfirmed manual submissions —
// those haven't been sanity-checked by anyone), explicitly labeled by
// review status so the model widens its range and lowers confidence when
// relying on unreviewed sources. Confirmed evidence is further weighted by
// the confirming contributors' historical accuracy — a claim confirmed by
// someone with a strong track record counts for more than one confirmed by
// a brand-new contributor. Returns the saved row, or null if
// ANTHROPIC_API_KEY is unset or the call fails — callers that need to
// surface that failure to a user should check process.env.ANTHROPIC_API_KEY
// themselves first.
export async function generateValuation(
  supabase: SupabaseClient,
  company: { id: string; name: string; sector: string | null; last_round_value: number | null; last_round_date: string | null; secondary_value: number | null; secondary_date: string | null }
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { data: allEvidence, error: evidenceError } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', company.id);

    if (evidenceError) return null;

    const evidence = (allEvidence || []).filter(
      (e) => e.status === 'verified' || (e.status === 'pending' && e.contributor === AI_RESEARCH_CONTRIBUTOR)
    );

    // Contributor accuracy is a global track record across the whole
    // ledger, not just this company, so pull every contributor's history.
    const { data: allContributorEvidence } = await supabase.from('lumen_evidence').select('contributor, status');
    const contributorStats = computeContributorStats(allContributorEvidence || []);

    const evidenceLines = evidence
      .map((e) => {
        const conf = CONFIDENCE_MAP[e.source_type] ?? 50;
        let reviewStatus: string;
        if (e.status === 'verified') {
          const confirmerAccuracies = (e.verified_by || [])
            .map((name: string) => contributorStats.get(name)?.accuracy)
            .filter((a: number | null | undefined): a is number => a !== null && a !== undefined);
          reviewStatus =
            confirmerAccuracies.length > 0
              ? `confirmed by contributor(s) averaging ${Math.round(confirmerAccuracies.reduce((a: number, b: number) => a + b, 0) / confirmerAccuracies.length)}% historical accuracy`
              : 'confirmed by a contributor with no track record yet';
        } else {
          reviewStatus = 'NOT yet reviewed by a human';
        }
        return `- [${e.category}] ${e.description}${e.value ? ` (${e.value})` : ''} — source: ${e.source_type} (confidence ${conf}, ${reviewStatus}), dated ${e.date}`;
      })
      .join('\n');

    const unconfirmedCount = evidence.filter((e) => e.status !== 'verified').length;

    const prompt = `You are a private-market valuation analyst. Based on the evidence below about ${company.name} (${company.sector || 'unknown sector'}), produce a valuation analysis.

Last primary financing round: ${fmtB(company.last_round_value)} (${company.last_round_date || 'unknown'})
Secondary market implied valuation: ${fmtB(company.secondary_value)} (${company.secondary_date || 'unknown'})

Evidence (${unconfirmedCount} of ${evidence.length} items are not yet human-reviewed):
${evidenceLines || '(none)'}

Weight human-confirmed evidence more heavily than not-yet-reviewed evidence, and weight evidence confirmed by contributors with strong historical accuracy more heavily than evidence confirmed by new or unproven contributors. If sources disagree with each other, or most evidence is unreviewed or confirmed only by unproven contributors, widen the bear/bull range and lower confidenceScore accordingly, and say so directly in the explanation rather than picking one figure silently.

Respond with ONLY valid JSON, no markdown code fences, no preamble or trailing text, matching exactly this schema:
{"bearCase": number, "baseCase": number, "bullCase": number, "confidenceScore": number, "keyDrivers": [{"label": string, "impact": "+" or "-", "note": string}], "explanation": string}

All valuation numbers are in billions of USD as plain numbers (e.g. 20.7). confidenceScore is 0-100. keyDrivers should have 3 to 5 items. explanation should be 2 to 3 sentences describing how the evidence was weighted to reach the base case.`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) return null;

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const { data: saved, error: saveError } = await supabase
      .from('lumen_valuations')
      .upsert(
        {
          company_id: company.id,
          bear_case: parsed.bearCase,
          base_case: parsed.baseCase,
          bull_case: parsed.bullCase,
          confidence_score: parsed.confidenceScore,
          key_drivers: parsed.keyDrivers,
          explanation: parsed.explanation,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      )
      .select('*')
      .single();

    if (saveError) return null;

    return saved;
  } catch {
    return null;
  }
}
