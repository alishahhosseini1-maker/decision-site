import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_RESEARCH_CONTRIBUTOR, AI_RESEARCH_SOURCE_TYPE, CATEGORIES, CONFIDENCE_MAP } from './lumen';
import { parseValuationFromText, parseRoundTypeFromText, parseFundingAmountFromText } from './valuationParser';

type ResearchItem = {
  category: string;
  description: string;
  value: string | null;
  sourceLabel: string;
  sourceType: string;
  date: string;
  citationUrl: string; // REQUIRED for AI research - URL to source for fact-checking
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
    const prompt = `Research ALL funding rounds in the complete funding history of ${company.name} from Crunchbase. Also include other recent, verifiable developments relevant to a private-market valuation: revenue, contracts, secondary-market transactions, headcount changes, customer retention, or comparable company moves.

CRITICAL FOR FUNDING ROUNDS: Each individual funding round MUST be categorized as "Funding" (not "Comparable" or any other category). Use Crunchbase as the primary source. Extract the COMPLETE funding timeline - ALL rounds from earliest to most recent. For each funding round, create a SEPARATE item with category "Funding" and extract:
- Date of the funding round (close date)
- Amount raised (if disclosed) - this goes in the description as "raised $XB"
- Post-money valuation (if disclosed) - this goes in the description as "at $XB valuation"
- Round type (Seed, Series A, etc.)

Example correct format for a funding round (MUST include BOTH amount raised AND post-money valuation):
{"category": "Funding", "description": "OpenAI raised $6.6B at a $157B post-money valuation in October 2024", "value": null, "sourceLabel": "Crunchbase", "sourceType": "Industry Research", "date": "2024-10-15", "citationUrl": "https://www.crunchbase.com/organization/openai"}

CRITICAL: Each funding round description MUST include BOTH:
1. Amount raised: "raised $XB"
2. Post-money valuation: "at $YB post-money valuation" or "at $YB valuation"

If Crunchbase does not provide the post-money valuation for a round, search for that specific round in Bloomberg, Reuters, TechCrunch, or other news sources to find the valuation. Do NOT include a round if you cannot find BOTH the amount raised AND the post-money valuation.

For funding data, ONLY cite Crunchbase unless Crunchbase does not have the information. If Crunchbase lacks data, you may cite SEC filings, Bloomberg, or Reuters as backup sources.

For non-funding items (revenue, contracts, comparables, etc.), use any verifiable source and appropriate category.

Respond with ONLY a JSON array, no markdown code fences, no preamble or trailing text, matching exactly this schema:
[{"category": string, "description": string, "value": string or null, "sourceLabel": string, "sourceType": string, "date": string, "citationUrl": string}]

"category" must be exactly one of: ${CATEGORIES.join(', ')}.
"sourceLabel" should identify the actual source (publication name or "Crunchbase").
"sourceType" must be exactly one of: ${CLASSIFIABLE_SOURCE_TYPES.join(', ')}, or "${AI_RESEARCH_SOURCE_TYPE}" only if none of those genuinely fit. Classify by what the source actually is, e.g. a wire/major outlet story (Reuters, Bloomberg, WSJ, TechCrunch) is "Reputable Publication"; an official company blog post or press release is "Company Announcement"; an SEC or government filing/database is "SEC / Government Filing"; a funding/deal database (Crunchbase, PitchBook) is "Industry Research"; a secondary-market platform record is "Verified Transaction"; an investor letter or update memo is "Investor Document".
"citationUrl" MUST be a direct URL to the source article/filing/page where this information can be verified. This is REQUIRED for every item - do not include any item without a citation URL. For Crunchbase funding data, use the company's Crunchbase URL.
"date" should be the date of the underlying event or report in YYYY-MM-DD format; use ${today} if unknown.

PRIORITIZATION: Return ALL funding rounds first (complete timeline from Crunchbase), then add other evidence types (revenue, contracts, etc.) up to a maximum of 25 total items. If you find nothing verifiable with citation URLs, return [].`;

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
      .filter((item) => {
        // CRITICAL: Enforce citation URL for all AI research
        // Reject any item without a valid citation URL
        if (!item) return false;
        if (!item.description || !item.sourceLabel) return false;
        if (!item.citationUrl || typeof item.citationUrl !== 'string' || item.citationUrl.trim() === '') {
          console.warn('[Perplexity] Rejected item without citation URL:', item.sourceLabel);
          return false;
        }
        return true;
      })
      .slice(0, 6)
      .map((item) => {
        const category = CATEGORIES.includes(item.category) ? item.category : CATEGORIES[0];
        const description = String(item.description).trim();
        let value = null;
        let roundType = null;
        let fundingAmount = null;

        // Always parse Funding evidence (ignore Perplexity's value field, which is often text)
        if (category === 'Funding') {
          // Parse post-money valuation
          const parsedValue = parseValuationFromText(description);
          if (parsedValue !== null) {
            value = parsedValue.toString();
          }

          // Parse amount raised in this round
          const parsedFundingAmount = parseFundingAmountFromText(description);
          if (parsedFundingAmount !== null) {
            fundingAmount = parsedFundingAmount;
          }

          roundType = parseRoundTypeFromText(description);
        } else {
          // For non-Funding categories, use Perplexity's value if provided
          value = item.value ? String(item.value).trim() : null;
        }

        const sourceType = Object.keys(CONFIDENCE_MAP).includes(item.sourceType) ? item.sourceType : AI_RESEARCH_SOURCE_TYPE;

        // Auto-verify high credibility sources (SEC, Reputable Publication, etc.)
        const HIGH_CREDIBILITY_SOURCES = [
          'SEC / Government Filing',
          'Reputable Publication',
          'Investor Document',
          'Company Announcement',
          'Verified Transaction'
        ];
        const isHighCredibility = HIGH_CREDIBILITY_SOURCES.includes(sourceType);

        return {
          company_id: company.id,
          category,
          description,
          value,
          funding_amount: fundingAmount,
          round_type: roundType,
          source_type: sourceType,
          source_label: String(item.sourceLabel).trim(),
          date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : today,
          contributor: AI_RESEARCH_CONTRIBUTOR,
          status: isHighCredibility ? 'verified' as const : 'pending' as const,
          verified_by: isHighCredibility ? [AI_RESEARCH_CONTRIBUTOR] : [] as string[],
          citation_url: String(item.citationUrl).trim(), // REQUIRED for AI research
          affiliation_disclosed: false, // AI research is never affiliated
        };
      });

    if (rows.length === 0) return [];

    // Fetch existing evidence to deduplicate before inserting
    const { data: existingEvidence } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', company.id);

    // Helper: check if two evidence items are equivalent (same event)
    const areEquivalent = (newItem: typeof rows[0], existing: any): boolean => {
      // Must be same category
      if (newItem.category !== existing.category) return false;

      // Must have similar dates (within 7 days - handles slight date discrepancies)
      if (newItem.date && existing.date) {
        const daysDiff = Math.abs(
          (new Date(newItem.date).getTime() - new Date(existing.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 7) return false;
      }

      // If both have values, they must be similar (handle "$965B" vs "965" variations)
      if (newItem.value && existing.value) {
        const normalize = (val: string) =>
          val
            .toUpperCase()
            .replace(/[^0-9.]/g, ''); // Extract just numbers
        const newVal = normalize(newItem.value);
        const existingVal = normalize(existing.value);

        // Values must be close (within 5% for rounding differences)
        const newNum = parseFloat(newVal);
        const existingNum = parseFloat(existingVal);
        if (!isNaN(newNum) && !isNaN(existingNum)) {
          const diff = Math.abs(newNum - existingNum);
          const avg = (newNum + existingNum) / 2;
          if (diff / avg > 0.05) return false; // More than 5% difference
        }
      }

      // If we get here, they're equivalent (same category, similar date, similar value)
      return true;
    };

    // Filter out duplicates
    const newRows = rows.filter((newItem) => {
      return !(existingEvidence || []).some((existing) => areEquivalent(newItem, existing));
    });

    if (newRows.length === 0) {
      console.log(`[perplexity] Skipped ${rows.length} duplicate evidence items for ${company.name}`);
      return [];
    }

    console.log(
      `[perplexity] Inserting ${newRows.length} new evidence items (${rows.length - newRows.length} duplicates skipped) for ${company.name}`
    );

    const { data: inserted, error } = await supabase.from('lumen_evidence').insert(newRows).select('*');
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
