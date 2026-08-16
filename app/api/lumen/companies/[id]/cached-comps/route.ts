import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Fetches cached comparable companies (both private and public)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get private comps
    const { data: privateComps, error: privateError } = await supabase
      .from('lumen_comps')
      .select('*')
      .eq('company_id', params.id)
      .eq('comp_type', 'private')
      .order('similarity_score', { ascending: false });

    if (privateError) throw privateError;

    // Get public comps
    const { data: publicComps, error: publicError } = await supabase
      .from('lumen_comps')
      .select('*')
      .eq('company_id', params.id)
      .eq('comp_type', 'public')
      .order('similarity_score', { ascending: false });

    if (publicError) throw publicError;

    // Get company's own revenue for context
    const { data: company } = await supabase
      .from('lumen_companies')
      .select('id, name, sector, last_round_value, secondary_value')
      .eq('id', params.id)
      .single();

    const { data: revenueEvidence } = await supabase
      .from('lumen_evidence')
      .select('value, description, date')
      .eq('company_id', params.id)
      .eq('category', 'Revenue')
      .eq('status', 'verified')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetRevenue = revenueEvidence?.value
      ? parseFloat(revenueEvidence.value.replace(/[^0-9.]/g, ''))
      : null;

    const targetValuation = company?.secondary_value || company?.last_round_value || null;
    const targetMultiple = targetRevenue && targetValuation && targetRevenue > 0
      ? targetValuation / targetRevenue
      : null;

    return NextResponse.json({
      private: privateComps || [],
      public: publicComps || [],
      target: {
        name: company?.name,
        sector: company?.sector,
        revenue: targetRevenue,
        valuation: targetValuation,
        multiple: targetMultiple,
      },
    });
  } catch (err: any) {
    console.error('[lumen/cached-comps] error:', err);
    return NextResponse.json({ error: 'Failed to fetch comps' }, { status: 500 });
  }
}
