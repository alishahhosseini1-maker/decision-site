import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch companies + valuations (same as existing endpoint)
    const { data: companies, error } = await supabase
      .from('lumen_companies')
      .select('*');

    if (error) throw error;

    const { data: valuations, error: valError } = await supabase
      .from('lumen_valuations')
      .select('company_id, base_case, bear_case, bull_case, confidence_score');

    if (valError) throw valError;

    // Fetch all Revenue evidence (verified only), grouped by company
    const { data: revenueEvidence, error: revError } = await supabase
      .from('lumen_evidence')
      .select('company_id, value, source_label, date, description')
      .eq('category', 'Revenue')
      .eq('status', 'verified')
      .order('date', { ascending: false });

    if (revError) throw revError;

    // Build maps
    const valByCompany = new Map((valuations || []).map((v) => [v.company_id, v]));

    // Group revenue evidence by company, take most recent
    const revByCompany = new Map<string, { value: number; source: string; date: string }>();
    (revenueEvidence || []).forEach((ev) => {
      if (revByCompany.has(ev.company_id)) return; // Already have most recent

      // Parse value - look for patterns like "$190B" or "$1.5B" or "$500M"
      // Ignore year-like patterns (4 digits)
      const text = ev.value || '';
      let parsed = null;

      // Try to find a dollar amount with B (billions) or M (millions)
      const billionMatch = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*B/i);
      const millionMatch = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*M/i);

      if (billionMatch) {
        parsed = parseFloat(billionMatch[1]);
      } else if (millionMatch) {
        parsed = parseFloat(millionMatch[1]) / 1000; // Convert to billions
      } else {
        // Fallback: try to extract first number that's not a year
        const numberMatch = text.match(/\$?\s*(\d+(?:\.\d+)?)/);
        if (numberMatch) {
          const num = parseFloat(numberMatch[1]);
          // If it's a reasonable revenue number (not a year like 2026)
          if (num < 100) {
            parsed = num; // Assume billions if just a number
          }
        }
      }

      if (parsed !== null && !isNaN(parsed) && parsed > 0) {
        revByCompany.set(ev.company_id, {
          value: parsed,
          source: ev.source_label || 'Evidence ledger',
          date: ev.date,
        });
      }
    });

    // Merge data
    const overview = (companies || []).map((c) => {
      const val = valByCompany.get(c.id);
      const rev = revByCompany.get(c.id);

      // Calculate valuation for display (secondary > AI > last round)
      const valuation = c.secondary_value || val?.base_case || c.last_round_value || null;

      // Calculate multiple
      const multiple = rev && valuation && rev.value > 0
        ? valuation / rev.value
        : null;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        symbol: c.symbol,
        sector: c.sector,
        valuation,
        bear_case: val?.bear_case || null,
        base_case: val?.base_case || null,
        bull_case: val?.bull_case || null,
        confidence_score: val?.confidence_score || null,
        revenue: rev?.value || null,
        revenue_source: rev?.source || null,
        revenue_date: rev?.date || null,
        multiple,
      };
    });

    // Sort by valuation descending (highest first)
    overview.sort((a, b) => (b.valuation || 0) - (a.valuation || 0));

    return NextResponse.json({ companies: overview });
  } catch (err: any) {
    console.error('[lumen/companies/overview] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load overview.' }, { status: 500 });
  }
}
