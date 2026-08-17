import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addFormDEvidence } from '@/app/lib/sec-edgar';

export const runtime = 'nodejs';
export const maxDuration = 60; // SEC API can be slow

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get company
    const { data: company, error: companyError } = await supabase
      .from('lumen_companies')
      .select('*')
      .eq('id', params.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    console.log(`[form-d] Fetching SEC Form D filings for ${company.name}...`);

    // Fetch and add Form D evidence
    const addedCount = await addFormDEvidence(supabase, company.id, company.name);

    return NextResponse.json({
      success: true,
      companyName: company.name,
      addedCount,
      message: addedCount > 0
        ? `Added ${addedCount} Form D filing(s) as evidence`
        : 'No new Form D filings found (company may not file Form D, or all filings already captured)'
    });

  } catch (err: any) {
    console.error('[form-d] Error:', err);
    return NextResponse.json(
      { error: 'Form D research failed', details: err.message },
      { status: 500 }
    );
  }
}
