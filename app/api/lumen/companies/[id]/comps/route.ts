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

    // Pick best revenue evidence, preferring current/actual over projected
    const revenueMatches = (evidence || []).filter(e => e.category === 'Revenue' && e.status === 'verified');
    if (revenueMatches.length === 0) {
      return NextResponse.json(
        { error: 'No revenue evidence yet — try "Research this company" or add a Revenue entry first.' },
        { status: 400 }
      );
    }

    // Prioritize current/actual revenue over projected
    const getRevenuePriority = (e: any) => {
      const text = `${e.value} ${e.description}`.toLowerCase();

      // Highest priority: run-rate / annualized STATED (not just referenced)
      // Must have a number + "run-rate" or "annualized revenue in 202X"
      if (/\$?\d+[\d.,]*\s*[btm]?\s*(run-rate|annualized)/i.test(text)) return 3;
      if (/\b(run-rate|annualized)\s+(revenue|sales)\s+(of\s+)?\$?\d/i.test(text)) return 3;

      // High priority: current/actual/TTM (but prefer run-rate)
      if (/\b(current|actual|ttm|trailing)\b/i.test(text)) return 2;

      // Projected indicators (low priority)
      if (/\b(project|forecast|expect|target|by 20(2[7-9]|3[0-9]))\b/i.test(text)) return 0;

      // Ambiguous or "to date" (medium-low priority - cumulative, not annual)
      return 1;
    };

    const sorted = revenueMatches.sort((a, b) => {
      // 1. Prefer run-rate > current > ambiguous > projected
      const aPriority = getRevenuePriority(a);
      const bPriority = getRevenuePriority(b);
      if (aPriority !== bPriority) return bPriority - aPriority;

      // 2. Then most recent date
      return (b.date || '').localeCompare(a.date || '');
    });

    const revenueEvidence = sorted[0];
    const isProjected = getRevenuePriority(revenueEvidence) === 0;

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

    const { data: valuationRow } = await supabase
      .from('lumen_valuations')
      .select('base_case')
      .eq('company_id', params.id)
      .maybeSingle();

    return NextResponse.json({
      revenueBillions,
      revenueSource: {
        description: revenueEvidence.description,
        sourceLabel: revenueEvidence.source_label,
        date: revenueEvidence.date,
        isProjected, // Flag for frontend to show disclaimer
      },
      comps: comps.map((c) => ({
        ...c,
        impliedValuation: Math.round(revenueBillions * c.multiple * 10) / 10,
      })),
      ownMultiples: {
        lastRound: company.last_round_value != null ? Math.round((company.last_round_value / revenueBillions) * 10) / 10 : null,
        lastRoundConfirmed: company.last_round_confirmed,
        aiFairValue: valuationRow?.base_case != null ? Math.round((valuationRow.base_case / revenueBillions) * 10) / 10 : null,
      },
    });
  } catch (err: any) {
    console.error('[lumen/comps] error:', err);
    return NextResponse.json({ error: "Couldn't find comparable companies. Try again." }, { status: 500 });
  }
}
