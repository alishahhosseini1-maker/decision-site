import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check what the API can actually see
    const { data: allHistory, error } = await supabase
      .from('lumen_valuation_history')
      .select('*')
      .limit(10);

    const { data: companies, error: compError } = await supabase
      .from('lumen_companies')
      .select('id, name')
      .limit(5);

    return NextResponse.json({
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      history_count: allHistory?.length || 0,
      history_sample: allHistory?.slice(0, 3),
      companies_sample: companies,
      errors: {
        history_error: error?.message,
        companies_error: compError?.message
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
