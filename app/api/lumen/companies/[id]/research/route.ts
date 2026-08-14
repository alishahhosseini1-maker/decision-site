import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { researchCompanyEvidence } from '@/app/lib/perplexity';

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

    const evidence = await researchCompanyEvidence(supabase, company);

    return NextResponse.json({ evidence });
  } catch (err: any) {
    console.error('[lumen/research] error:', err);
    return NextResponse.json({ error: "Couldn't complete research. Try again." }, { status: 500 });
  }
}
