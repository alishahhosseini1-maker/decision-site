import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findComps } from '@/app/lib/perplexity';
import { extractRevenueBillions, pickMostCredible } from '@/app/lib/valuation';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
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

    const { data: evidence, error: evidenceError } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', params.id);

    if (evidenceError) throw evidenceError;

    const revenueEvidence = pickMostCredible(evidence || [], 'Revenue');
    if (!revenueEvidence) {
      return NextResponse.json(
        { error: 'No revenue evidence yet — try "Research this company" or add a Revenue entry first.' },
        { status: 400 }
      );
    }

    const revenueBillions = await extractRevenueBillions(revenueEvidence.description, revenueEvidence.value);
    if (revenueBillions === null) {
      return NextResponse.json(
        { error: "Couldn't extract a clear revenue figure from the evidence on file." },
        { status: 400 }
      );
    }

    const comps = await findComps(company.name, company.sector);
    if (comps.length === 0) {
      return NextResponse.json({ error: 'No comparable public companies with sourced multiples found.' }, { status: 400 });
    }

    return NextResponse.json({
      revenueBillions,
      revenueSource: {
        description: revenueEvidence.description,
        sourceLabel: revenueEvidence.source_label,
        date: revenueEvidence.date,
      },
      comps: comps.map((c) => ({
        ...c,
        impliedValuation: Math.round(revenueBillions * c.multiple * 10) / 10,
      })),
    });
  } catch (err: any) {
    console.error('[lumen/comps] error:', err);
    return NextResponse.json({ error: "Couldn't find comparable companies. Try again." }, { status: 500 });
  }
}
