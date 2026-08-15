import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateValuation } from '@/app/lib/valuation';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY.' }, { status: 500 });
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

    const valuation = await generateValuation(supabase, company);
    if (!valuation) {
      return NextResponse.json({ error: "Couldn't generate a valuation. Try again." }, { status: 500 });
    }

    return NextResponse.json({ valuation });
  } catch (err: any) {
    console.error('[lumen/valuation] error:', err);
    return NextResponse.json({ error: "Couldn't generate a valuation. Try again." }, { status: 500 });
  }
}
