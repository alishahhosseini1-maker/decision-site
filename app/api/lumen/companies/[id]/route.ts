import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
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
      .eq('company_id', params.id)
      .order('date', { ascending: false });

    if (evidenceError) throw evidenceError;

    const { data: valuation } = await supabase
      .from('lumen_valuations')
      .select('*')
      .eq('company_id', params.id)
      .maybeSingle();

    return NextResponse.json({ company, evidence: evidence || [], valuation: valuation || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Company not found.' }, { status: 404 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete evidence first (foreign key constraint)
    await supabase.from('lumen_evidence').delete().eq('company_id', params.id);

    // Delete valuations
    await supabase.from('lumen_valuations').delete().eq('company_id', params.id);

    // Delete the company
    const { error } = await supabase.from('lumen_companies').delete().eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete company.' }, { status: 500 });
  }
}
