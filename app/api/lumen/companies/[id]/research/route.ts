import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AI_RESEARCH_CONTRIBUTOR, AI_RESEARCH_SOURCE_TYPE, CATEGORIES } from '@/app/lib/lumen';

export const runtime = 'nodejs';

type ResearchItem = {
  category: string;
  description: string;
  value: string | null;
  sourceLabel: string;
  date: string;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing PERPLEXITY_API_KEY.' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: company, error: companyError } = await supabase
      .from('lumen_companies')
      .select('*')
      .eq('id', params.id)
      .single();

    if (companyError) throw companyError;

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Research recent, verifiable developments about ${company.name} (${company.sector || 'unknown sector'}) relevant to a private-market valuation: funding rounds, revenue, contracts, secondary-market transactions, headcount changes, customer retention, or comparable company moves.

Only include items you can cite an actual source for. Do not speculate or include anything you are not reasonably confident is accurate.

Respond with ONLY a JSON array, no markdown code fences, no preamble or trailing text, matching exactly this schema:
[{"category": string, "description": string, "value": string or null, "sourceLabel": string, "date": string}]

"category" must be exactly one of: ${CATEGORIES.join(', ')}.
"sourceLabel" should identify the actual source (publication name or URL).
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${text}`);
    }

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
        company_id: params.id,
        category: CATEGORIES.includes(item.category) ? item.category : CATEGORIES[0],
        description: String(item.description).trim(),
        value: item.value ? String(item.value).trim() : null,
        source_type: AI_RESEARCH_SOURCE_TYPE,
        source_label: String(item.sourceLabel).trim(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : today,
        contributor: AI_RESEARCH_CONTRIBUTOR,
        status: 'pending' as const,
        verified_by: [],
      }));

    if (rows.length === 0) {
      return NextResponse.json({ evidence: [] });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('lumen_evidence')
      .insert(rows)
      .select('*');

    if (insertError) throw insertError;

    return NextResponse.json({ evidence: inserted || [] });
  } catch (err: any) {
    console.error('[lumen/research] error:', err);
    return NextResponse.json({ error: "Couldn't complete research. Try again." }, { status: 500 });
  }
}
