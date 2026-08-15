import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_RESEARCH_CONTRIBUTOR, AI_RESEARCH_SOURCE_TYPE, CATEGORIES, CONFIDENCE_MAP } from './lumen';

type ResearchItem = {
  category: string;
  description: string;
  value: string | null;
  sourceLabel: string;
  sourceType: string;
  date: string;
};

const CLASSIFIABLE_SOURCE_TYPES = Object.keys(CONFIDENCE_MAP).filter((t) => t !== AI_RESEARCH_SOURCE_TYPE);

// Searches for recent, sourced developments about a company and inserts them
// directly as pending evidence, contributed by the AI research bot. Each
// finding is classified into the same credibility tiers a human would pick
// from (a Reuters story becomes "Reputable Publication", a company blog
// post becomes "Company Announcement", etc.) rather than one flat "AI
// Research" bucket, so credibility ranking reflects the actual underlying
// source — "AI Research" is only used as a fallback when nothing more
// specific fits. Returns the inserted rows, or an empty array if
// PERPLEXITY_API_KEY is unset, the call fails, or nothing verifiable was
// found — callers that need to distinguish "no key" from "no results"
// should check process.env.PERPLEXITY_API_KEY themselves first.
export async function researchCompanyEvidence(
  supabase: SupabaseClient,
  company: { id: string; name: string; sector: string | null }
) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [];

  try {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Research recent, verifiable developments about ${company.name} (${company.sector || 'unknown sector'}) relevant to a private-market valuation: funding rounds, revenue, contracts, secondary-market transactions, headcount changes, customer retention, or comparable company moves.

Only include items you can cite an actual source for. Do not speculate or include anything you are not reasonably confident is accurate.

Respond with ONLY a JSON array, no markdown code fences, no preamble or trailing text, matching exactly this schema:
[{"category": string, "description": string, "value": string or null, "sourceLabel": string, "sourceType": string, "date": string}]

"category" must be exactly one of: ${CATEGORIES.join(', ')}.
"sourceLabel" should identify the actual source (publication name or URL).
"sourceType" must be exactly one of: ${CLASSIFIABLE_SOURCE_TYPES.join(', ')}, or "${AI_RESEARCH_SOURCE_TYPE}" only if none of those genuinely fit. Classify by what the source actually is, e.g. a wire/major outlet story (Reuters, Bloomberg, WSJ, TechCrunch) is "Reputable Publication"; an official company blog post or press release is "Company Announcement"; an SEC or government filing/database is "SEC / Government Filing"; a funding/deal database (Crunchbase, PitchBook) is "Industry Research"; a secondary-market platform record is "Verified Transaction"; an investor letter or update memo is "Investor Document".
"date" should be the date of the underlying event or report in YYYY-MM-DD format; use ${today} if unknown.
Return at most 6 items. If you find nothing verifiable, return [].`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json|```/g, '').trim();

    let items: ResearchItem[];
    try {
      items = JSON.parse(cleaned);
    } catch {
      items = [];
    }
    if (!Array.isArray(items)) items = [];

    const rows = items
      .filter((item) => item && item.description && item.sourceLabel)
      .slice(0, 6)
      .map((item) => ({
        company_id: company.id,
        category: CATEGORIES.includes(item.category) ? item.category : CATEGORIES[0],
        description: String(item.description).trim(),
        value: item.value ? String(item.value).trim() : null,
        source_type: Object.keys(CONFIDENCE_MAP).includes(item.sourceType) ? item.sourceType : AI_RESEARCH_SOURCE_TYPE,
        source_label: String(item.sourceLabel).trim(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : today,
        contributor: AI_RESEARCH_CONTRIBUTOR,
        status: 'pending' as const,
        verified_by: [] as string[],
      }));

    if (rows.length === 0) return [];

    const { data: inserted, error } = await supabase.from('lumen_evidence').insert(rows).select('*');
    if (error) return [];

    return inserted || [];
  } catch {
    return [];
  }
}

export type Comp = {
  name: string;
  ticker: string;
  multiple: number;
  sourceLabel: string;
};

// Finds real, currently-public companies comparable to this one and their
// current revenue multiple, cited. Not persisted — this is meant to be a
// live, on-demand comparison rather than stored company data, so it's
// re-fetched fresh each time rather than cached in the ledger.
export async function findComps(name: string, sector: string | null): Promise<Comp[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [];

  try {
    const prompt = `Identify 3 to 5 real, currently publicly traded companies that are the closest comparables to "${name}" (${sector || 'unknown sector'}) by business model and sector. For each, find its current revenue multiple (enterprise value / revenue, most recent trailing-twelve-month figure you can find).

Only include companies you can cite an actual current source for their multiple. Do not estimate or invent a multiple.

Respond with ONLY a JSON array, no markdown code fences, no preamble or trailing text, matching exactly this schema:
[{"name": string, "ticker": string, "multiple": number, "sourceLabel": string}]

"multiple" is EV/Revenue as a plain number (e.g. 12.4). "sourceLabel" should identify where the multiple came from (publication or data source and approximate date). If you cannot find at least 2 genuine comparables with real sourced multiples, return [].`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json|```/g, '').trim();

    let items: Comp[];
    try {
      items = JSON.parse(cleaned);
    } catch {
      items = [];
    }
    if (!Array.isArray(items)) items = [];

    return items
      .filter((item) => item && item.name && item.sourceLabel && typeof item.multiple === 'number' && item.multiple > 0)
      .slice(0, 5)
      .map((item) => ({
        name: String(item.name).trim(),
        ticker: item.ticker ? String(item.ticker).trim().toUpperCase() : '',
        multiple: item.multiple,
        sourceLabel: String(item.sourceLabel).trim(),
      }));
  } catch {
    return [];
  }
}
