import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

type Enrichment = {
  sector: string | null;
  symbol: string | null;
  lastRoundValue: number | null;
  lastRoundDate: string | null;
  secondaryValue: number | null;
  secondaryDate: string | null;
};

async function enrichCompany(name: string): Promise<Enrichment> {
  const empty: Enrichment = {
    sector: null,
    symbol: null,
    lastRoundValue: null,
    lastRoundDate: null,
    secondaryValue: null,
    secondaryDate: null,
  };
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return empty;

  try {
    const prompt = `For the private company "${name}", find its industry sector and known private-market valuation data.

Respond with ONLY valid JSON, no markdown code fences, no preamble or trailing text, matching exactly this schema:
{"sector": string or null, "symbol": string, "lastRoundValue": number or null, "lastRoundDate": string or null, "secondaryValue": number or null, "secondaryDate": string or null}

"symbol" is a short 3-6 letter uppercase abbreviation for internal display (does not need to be a real public ticker) — always provide one.
"lastRoundValue"/"secondaryValue" are valuations in billions of USD as plain numbers (e.g. 20.7), from the most recent primary funding round and any secondary-market activity respectively.
"lastRoundDate"/"secondaryDate" are short human dates like "Mar 2025".
Use null for anything you cannot find a real, reasonably confident source for.`;

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
      lastRoundValue: typeof parsed.lastRoundValue === 'number' ? parsed.lastRoundValue : null,
      lastRoundDate: parsed.lastRoundDate ? String(parsed.lastRoundDate).trim() : null,
      secondaryValue: typeof parsed.secondaryValue === 'number' ? parsed.secondaryValue : null,
      secondaryDate: parsed.secondaryDate ? String(parsed.secondaryDate).trim() : null,
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

    const enrichment = await enrichCompany(name);
    const symbol = enrichment.symbol || fallbackSymbol(name);

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
        sector: enrichment.sector,
        last_round_value: enrichment.lastRoundValue,
        last_round_date: enrichment.lastRoundDate,
        secondary_value: enrichment.secondaryValue,
        secondary_date: enrichment.secondaryDate,
        created_by: contributor,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ company: { ...data, valuation: null } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add company.' }, { status: 500 });
  }
}
