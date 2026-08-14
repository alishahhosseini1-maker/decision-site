import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { researchCompanyEvidence } from '@/app/lib/perplexity';

export const runtime = 'nodejs';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function fallbackSymbol(name: string) {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 5) || 'CO';
}

type Lookup = {
  sector: string | null;
  symbol: string | null;
};

// Only looks up category metadata (sector, a display symbol) — not funding
// figures. Those come exclusively from sourced, confirmable evidence via
// researchCompanyEvidence, so the company header never shows an unsourced
// number that could contradict the ledger.
async function lookupCompanyMeta(name: string): Promise<Lookup> {
  const empty: Lookup = { sector: null, symbol: null };
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return empty;

  try {
    const prompt = `For the private company "${name}", identify its industry sector.

Respond with ONLY valid JSON, no markdown code fences, no preamble or trailing text, matching exactly this schema:
{"sector": string or null, "symbol": string}

"sector" is a short phrase like "Foundation models" or "Defense technology"; null if you cannot identify the company.
"symbol" is a short 3-6 letter uppercase abbreviation for internal display (does not need to be a real public ticker) — always provide one.`;

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

    if (!response.ok) return empty;

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '{}';
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      sector: parsed.sector ? String(parsed.sector).trim() : null,
      symbol: parsed.symbol ? String(parsed.symbol).trim().toUpperCase().slice(0, 8) : null,
    };
  } catch {
    return empty;
  }
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: companies, error } = await supabase
      .from('lumen_companies')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const { data: valuations, error: valError } = await supabase
      .from('lumen_valuations')
      .select('company_id, base_case, confidence_score');

    if (valError) throw valError;

    const valByCompany = new Map((valuations || []).map((v) => [v.company_id, v]));

    return NextResponse.json({
      companies: (companies || []).map((c) => ({
        ...c,
        valuation: valByCompany.get(c.id) || null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load companies.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const contributor = (body.contributor || 'anonymous').trim();

    if (!name) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const meta = await lookupCompanyMeta(name);
    const symbol = meta.symbol || fallbackSymbol(name);

    const baseSlug = slugify(name) || slugify(symbol) || 'company';
    let slug = baseSlug;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase.from('lumen_companies').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data, error } = await supabase
      .from('lumen_companies')
      .insert({
        slug,
        name,
        symbol,
        sector: meta.sector,
        last_round_value: null,
        last_round_date: null,
        secondary_value: null,
        secondary_date: null,
        created_by: contributor,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Populate the evidence ledger with sourced findings right away, rather
    // than leaving a brand-new company empty.
    await researchCompanyEvidence(supabase, data);

    return NextResponse.json({ company: { ...data, valuation: null } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add company.' }, { status: 500 });
  }
}
