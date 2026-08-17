import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { AI_RESEARCH_CONTRIBUTOR, CONFIDENCE_MAP, computeContributorStats, fmtB } from './lumen';
import { FORMULA_PARAMS, calculateFormulaMetadata } from './formula';

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

// Extracts BOTH raise amount and resulting valuation from funding evidence
async function extractFundingDetails(description: string, value: string | null): Promise<{ raised: number | null; valuation: number | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { raised: null, valuation: null };

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Extract both the amount raised AND the resulting company valuation from this funding event, in billions of USD as plain numbers.

Event: ${description}${value ? ` (${value})` : ''}

Respond with ONLY JSON, no markdown, no prose: {"raisedBillions": number or null, "valuationBillions": number or null}

If only one is mentioned, return null for the missing one.`,
        },
      ],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) return { raised: null, valuation: null };

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      raised: typeof parsed.raisedBillions === 'number' ? parsed.raisedBillions : null,
      valuation: typeof parsed.valuationBillions === 'number' ? parsed.valuationBillions : null,
    };
  } catch {
    return { raised: null, valuation: null };
  }
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
  // Filter to category AND exclude uncorroborated affiliated evidence
  const matches = evidence.filter((e) => {
    if (e.category !== category) return false;

    // CRITICAL: Affiliated evidence requires independent verification before it can be picked
    // @ts-ignore - affiliation_disclosed may not be in EvidenceRow type yet
    if (e.affiliation_disclosed === true) {
      // @ts-ignore - status exists at runtime
      if (e.status !== 'verified') {
        return false; // Block pending affiliated evidence
      }

      // Even if verified, check if it has 2+ independent (non-affiliated) verifiers
      // @ts-ignore - verified_by exists at runtime
      const verifiers = e.verified_by || [];
      const independentCount = verifiers.filter((v: any) => {
        if (typeof v === 'string') return true; // Legacy verifiers assumed independent
        return v.affiliation_disclosed === false;
      }).length;

      if (independentCount < 2) {
        return false; // Block affiliated evidence without 2+ independent verifiers
      }
    }

    return true;
  });

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
// most credible Funding / Secondary item found and uses it to
// populate Last round / Secondary implied immediately — grounded in a real,
// specific citation rather than a blind guess, but marked unconfirmed since
// no human has reviewed it yet.
export async function applyBestUnconfirmedFigures(supabase: SupabaseClient, companyId: string, evidence: EvidenceRow[]) {
  const patch: Record<string, unknown> = {};

  const funding = pickMostCredible(evidence, 'Funding');
  if (funding) {
    const details = await extractFundingDetails(funding.description, funding.value);
    if (details.valuation !== null) {
      patch.last_round_value = details.valuation;
      patch.last_round_date = funding.date;
      patch.last_round_confirmed = false;
    }
    if (details.raised !== null) {
      patch.last_round_raised = details.raised;
    }
  }

  const secondary = pickMostCredible(evidence, 'Secondary');
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

// Called when a Funding / Secondary evidence item is confirmed by a
// human. That confirmed figure always wins over an unconfirmed one; among
// confirmed figures, only a more recent event date overwrites the existing
// one, so an older confirmation can't clobber a newer one confirmed earlier.
export async function applyConfirmedFigure(supabase: SupabaseClient, companyId: string, evidence: EvidenceRow) {
  if (evidence.category !== 'Funding' && evidence.category !== 'Secondary') return;

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

// Calculates a formulaic confidence score (0-100) based on evidence quality metrics.
// Applies proportional penalties for staleness, unverified evidence, lack of momentum,
// and adjusts for source credibility. Replaces AI-generated confidence scores to eliminate
// clustering at arbitrary thresholds and ensure verification status properly differentiates scores.
function calculateConfidenceScore(
  evidence: Array<{ category: string; status: string; source_type: string; date: string | null }>,
  referenceDate: string
): number {
  let score = 100;

  const MOMENTUM_CATEGORIES = ['Revenue', 'Headcount', 'Product', 'Contracts', 'Metrics'];

  // 1. Staleness penalty (proportional: -0.5 pts per month, max -50)
  const fundingEvidence = evidence.filter(e => e.category === 'Funding' && e.date);
  if (fundingEvidence.length > 0) {
    const mostRecent = fundingEvidence.reduce((latest, e) =>
      (e.date && (!latest.date || e.date > latest.date)) ? e : latest
    );
    if (mostRecent.date) {
      const monthsStale = Math.floor(
        (new Date(referenceDate).getTime() - new Date(mostRecent.date).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const stalenessPenalty = Math.min(50, monthsStale * 0.5);
      score -= stalenessPenalty;
    }
  }

  // 2. Verification penalty (proportional: -30 pts for 100% unverified)
  if (evidence.length > 0) {
    const unverifiedCount = evidence.filter(e => e.status !== 'verified').length;
    const unverifiedPct = unverifiedCount / evidence.length;
    score -= unverifiedPct * 30;
  }

  // 3. Momentum penalty (binary: -15 for no momentum evidence)
  const hasMomentum = evidence.some(e => MOMENTUM_CATEGORIES.includes(e.category));
  if (!hasMomentum) {
    score -= 15;
  }

  // 4. Source credibility adjustment (±10 pts based on source quality)
  if (evidence.length > 0) {
    const avgSourceConf = evidence.reduce((sum, e) => sum + (CONFIDENCE_MAP[e.source_type] ?? 50), 0) / evidence.length;
    // Center adjustment at 75 (Industry Research baseline)
    const credibilityAdj = (avgSourceConf - 75) * 0.2;
    score += credibilityAdj;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// PRIMARY + SECONDARY WEIGHTING FORMULA
// ============================================================================
//
// **VALIDATION CAVEAT (Aug 2026):**
// Parameters calibrated from N=1 (Anthropic only). SpaceX excluded (went public June 2026).
// RE-VALIDATE when N≥5 companies have both primary and secondary evidence.
//
// See scripts/primary-secondary-parameters-basis.md for parameter justification.
//
// **Grounded parameters:**
// - STALENESS_THRESHOLD (20mo): From this session's staleness analysis
// - BASELINE_CREDIBILITY (75): Inherits from existing CONFIDENCE_MAP
//
// **Principled guesses (NOT validated):**
// - ILLIQUIDITY_DISCOUNT (15%): Literature suggests 10-25%, no empirical basis from our data
// - NAMED_SOURCE_BONUS (15%): Educated guess for named vs anonymous sources
// - VERIFIED_BONUS (10%): Educated guess for verified vs pending status
// - MIN/MAX_SECONDARY_WEIGHT (10%/70%): Design choices to bound influence
// - MAX_CREDIBILITY_MULTIPLIER (1.5): Design choice to prevent credibility overwhelming staleness
//
// Despite n=1 limitation, formula is still better than inconsistent AI judgment
// (which produced 78% weight for SpaceX, 36% for Anthropic with similar evidence patterns).
//
type SecondaryEvidence = {
  value: string;
  date: string | null;
  description: string;
  source_type: string;
  status: string;
};

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
  companyRaw: { id: string; name: string; sector: string | null; last_round_value: number | null; last_round_date: string | null; secondary_value: number | null; secondary_date: string | null },
  options?: { asOf?: string } // Optional: only consider evidence dated STRICTLY BEFORE this date (for benchmarking)
) {
  // Data integrity check: secondary_value should never exist without secondary_date
  // If it does, null it out to prevent undated signals from being used
  const cleanCompany = {
    ...companyRaw,
    secondary_value: (companyRaw.secondary_value && !companyRaw.secondary_date) ? null : companyRaw.secondary_value,
    secondary_date: (companyRaw.secondary_value && !companyRaw.secondary_date) ? null : companyRaw.secondary_date,
  };

  // When asOf filter is active, null out any metadata fields with dates >= cutoff
  // to prevent leaked future data from contaminating the valuation
  const company = options?.asOf ? {
    ...cleanCompany,
    last_round_value: (cleanCompany.last_round_date && cleanCompany.last_round_date >= options.asOf) ? null : cleanCompany.last_round_value,
    last_round_date: (cleanCompany.last_round_date && cleanCompany.last_round_date >= options.asOf) ? null : cleanCompany.last_round_date,
    secondary_value: (cleanCompany.secondary_date && cleanCompany.secondary_date >= options.asOf) ? null : cleanCompany.secondary_value,
    secondary_date: (cleanCompany.secondary_date && cleanCompany.secondary_date >= options.asOf) ? null : cleanCompany.secondary_date,
  } : cleanCompany;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { data: allEvidence, error: evidenceError } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', company.id);

    if (evidenceError) return null;

    // DEBUG: Log asOf parameter
    if (options?.asOf) {
      console.log('[valuation] asOf filter active:', options.asOf);
    }

    const evidence = (allEvidence || []).filter((e) => {
      // Date filter for benchmarking: exclude evidence at or after cutoff date (strictly before)
      if (options?.asOf) {
        // Compare date strings directly (YYYY-MM-DD format) for clarity
        // Cutoff is the date of the known price point we're predicting, so exclude >= (not just >)
        if (e.date >= options.asOf) {
          console.log('[valuation] FILTERED OUT:', e.date, e.description.substring(0, 60));
          return false; // Exclude evidence at or after cutoff (strictly before)
        }
      }

      // CRITICAL: Affiliated evidence is INERT until independently verified
      // Affiliated evidence (affiliation_disclosed = true) requires 2+ non-affiliated verifiers
      if (e.affiliation_disclosed === true) {
        if (e.status !== 'verified') {
          return false; // Block pending affiliated evidence
        }

        // Even if verified, check if it has 2+ independent (non-affiliated) verifiers
        const verifiers = e.verified_by || [];
        const independentCount = verifiers.filter((v: any) => {
          if (typeof v === 'string') return true; // Legacy verifiers assumed independent
          return v.affiliation_disclosed === false;
        }).length;

        if (independentCount < 2) {
          return false; // Block affiliated evidence without 2+ independent verifiers
        }
      }

      // Non-affiliated evidence: standard rules
      return e.status === 'verified' || (e.status === 'pending' && e.contributor === AI_RESEARCH_CONTRIBUTOR);
    });

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

    // Evidence quality diagnostics
    const fundingEvidence = evidence.filter((e) => e.category === 'Funding');
    const momentumCategories = ['Revenue', 'Headcount', 'Product', 'Contracts', 'Metrics'];
    const momentumEvidence = evidence.filter((e) => momentumCategories.includes(e.category));

    const mostRecentFunding = fundingEvidence.length > 0
      ? fundingEvidence.reduce((latest, e) => (e.date > latest.date ? e : latest))
      : null;

    const referenceDate = options?.asOf || new Date().toISOString().split('T')[0];
    const fundingStalenessMonths = mostRecentFunding
      ? Math.round((new Date(referenceDate).getTime() - new Date(mostRecentFunding.date).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : null;

    const evidenceWarnings: string[] = [];
    if (fundingStalenessMonths !== null && fundingStalenessMonths > 20) {
      evidenceWarnings.push(`Most recent funding evidence is ${fundingStalenessMonths} months old (dated ${mostRecentFunding!.date}). This is stale — companies can change significantly in 20+ months.`);
    }
    if (momentumEvidence.length === 0 && fundingEvidence.length > 0) {
      evidenceWarnings.push(`No momentum evidence available (revenue, headcount, product milestones, contracts). Valuation is anchored solely to funding rounds without current growth signals.`);
    }

    const evidenceWarningText = evidenceWarnings.length > 0
      ? `\n\nEVIDENCE QUALITY WARNINGS:\n${evidenceWarnings.map(w => `- ${w}`).join('\n')}\n\nBecause of these limitations, you MUST:\n1. Reduce confidenceScore (typically to 40 or below for stale+funding-only data)\n2. Widen the bear/bull range proportionally to the staleness/uncertainty\n3. Explicitly state in the explanation that confidence is reduced due to ${evidenceWarnings.length === 2 ? 'stale funding-only evidence' : evidenceWarnings[0].includes('stale') ? 'stale evidence' : 'lack of momentum evidence'}.`
      : '';

    const prompt = `You are a private-market valuation analyst. Based on the evidence below about ${company.name} (${company.sector || 'unknown sector'}), produce a valuation analysis.

Last primary financing round: ${fmtB(company.last_round_value)} (${company.last_round_date || 'unknown'})
Secondary implied valuation: ${fmtB(company.secondary_value)} (${company.secondary_date || 'unknown'})

Evidence (${unconfirmedCount} of ${evidence.length} items are not yet human-reviewed):
${evidenceLines || '(none)'}${evidenceWarningText}

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

    // Calculate formulaic confidence score (replaces AI-generated score)
    const confidenceScore = calculateConfidenceScore(evidence, referenceDate);

    // Calculate formulaic base case when both primary and secondary evidence exist
    // (replaces AI-generated base case to ensure deterministic weighting)
    //
    // TODO: STRUCTURAL FIX NEEDED (near-term)
    // This appends formula explanation to AI-generated text as a patch.
    // Real fix: regenerate explanation AFTER formula override (Option C) or reorder
    // generation so AI knows the final base case. Current approach creates
    // explanations that reference wrong numbers until the appended paragraph corrects them.
    // This will recur on every company where formula applies — not a "someday" item.
    let baseCase = parsed.baseCase;
    let explanation = parsed.explanation;

    // Find most recent Secondary evidence
    const secondaryEvidence = evidence
      .filter((e) => e.category === 'Secondary')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      [0];

    // If we have both primary round data and secondary evidence, use formula
    if (company.last_round_value && company.last_round_date && secondaryEvidence) {
      const formulaResult = calculateFormulaMetadata(
        company.last_round_value,
        company.last_round_date,
        secondaryEvidence,
        referenceDate
      );

      if (formulaResult !== null) {
        baseCase = formulaResult.baseCase;

        // Append formula transparency explanation (fully parameterized)
        const primaryWeight = (formulaResult.primaryWeight * 100).toFixed(1);
        const secondaryWeight = (formulaResult.secondaryWeight * 100).toFixed(1);
        const primaryAge = formulaResult.monthsSincePrimary.toFixed(1);
        const secondaryAge = formulaResult.monthsSinceSecondary.toFixed(1);
        const discountPct = (FORMULA_PARAMS.ILLIQUIDITY_DISCOUNT * 100).toFixed(0);

        explanation += `\n\n**Formula-adjusted base case:** The $${baseCase}B base case applies a deterministic primary+secondary weighting formula: ${primaryWeight}% weight to the $${company.last_round_value}B primary round (${company.last_round_date}) + ${secondaryWeight}% weight to the ${formulaResult.secondaryValue}B secondary market signal (${secondaryEvidence.date}, discounted ${discountPct}% for illiquidity). The ${formulaResult.secondaryWeight < 0.3 ? 'low' : formulaResult.secondaryWeight > 0.6 ? 'high' : 'moderate'} secondary weight reflects that ${formulaResult.monthsSincePrimary < 6 ? 'the primary round is fresh (' + primaryAge + ' months old)' : 'the primary round is ' + primaryAge + ' months old'}, preventing ${formulaResult.secondaryWeight < 0.3 ? 'speculative secondary premiums from distorting the anchor' : 'stale primary data from anchoring to outdated valuations'}.`;
      }
      // else: fall back to AI base case if formula can't parse secondary value
    }

    const { data: saved, error: saveError } = await supabase
      .from('lumen_valuations')
      .upsert(
        {
          company_id: company.id,
          bear_case: parsed.bearCase,
          base_case: baseCase, // Use formulaic base case if available, else AI base case
          bull_case: parsed.bullCase,
          confidence_score: confidenceScore,
          key_drivers: parsed.keyDrivers,
          explanation: explanation, // Use appended explanation if formula was applied
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
