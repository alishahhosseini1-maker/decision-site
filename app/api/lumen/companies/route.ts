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
    const symbol = (body.symbol || '').trim().toUpperCase();
    const sector = (body.sector || '').trim();
    const lastRoundValue = body.lastRoundValue === '' || body.lastRoundValue == null ? null : Number(body.lastRoundValue);
    const lastRoundDate = (body.lastRoundDate || '').trim() || null;
    const secondaryValue = body.secondaryValue === '' || body.secondaryValue == null ? null : Number(body.secondaryValue);
    const secondaryDate = (body.secondaryDate || '').trim() || null;
    const contributor = (body.contributor || 'anonymous').trim();

    if (!name || !symbol) {
      return NextResponse.json({ error: 'Company name and symbol are required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
        sector: sector || null,
        last_round_value: lastRoundValue,
        last_round_date: lastRoundDate,
        secondary_value: secondaryValue,
        secondary_date: secondaryDate,
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
