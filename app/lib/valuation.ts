import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { AI_RESEARCH_SOURCE_TYPE, CONFIDENCE_MAP, fmtB } from './lumen';

// Generates a bear/base/bull valuation from a company's evidence and saves
// it. Includes not just confirmed evidence but also not-yet-confirmed
// "AI Research" findings (never unconfirmed manual submissions — those
// haven't been sanity-checked by anyone yet), explicitly labeled so the
// model can widen its range and lower confidence when it's relying on
// unreviewed sources. Returns the saved row, or null if ANTHROPIC_API_KEY
// is unset or the call fails — callers that need to surface that failure
// to a user should check process.env.ANTHROPIC_API_KEY themselves first.
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
      (e) => e.status === 'verified' || (e.status === 'pending' && e.source_type === AI_RESEARCH_SOURCE_TYPE)
    );

    const evidenceLines = evidence
      .map((e) => {
        const conf = CONFIDENCE_MAP[e.source_type] ?? 50;
        const reviewStatus = e.status === 'verified' ? 'confirmed by a human reviewer' : 'NOT yet reviewed by a human';
        return `- [${e.category}] ${e.description}${e.value ? ` (${e.value})` : ''} — source: ${e.source_type} (confidence ${conf}, ${reviewStatus}), dated ${e.date}`;
      })
      .join('\n');

    const unconfirmedCount = evidence.filter((e) => e.status !== 'verified').length;

    const prompt = `You are a private-market valuation analyst. Based on the evidence below about ${company.name} (${company.sector || 'unknown sector'}), produce a valuation analysis.

Last primary financing round: ${fmtB(company.last_round_value)} (${company.last_round_date || 'unknown'})
Secondary market implied valuation: ${fmtB(company.secondary_value)} (${company.secondary_date || 'unknown'})

Evidence (${unconfirmedCount} of ${evidence.length} items are not yet human-reviewed):
${evidenceLines || '(none)'}

Weight human-confirmed evidence more heavily than not-yet-reviewed evidence. If sources disagree with each other, or most evidence is unreviewed, widen the bear/bull range and lower confidenceScore accordingly, and say so directly in the explanation rather than picking one figure silently.

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
