import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all funding evidence
  const { data, error } = await supabase
    .from('lumen_evidence')
    .select('id, company_id, category, value, date')
    .eq('category', 'Funding')
    .limit(100);

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    totalRecords: data?.length || 0,
    openAIRecords: data?.filter(e => e.company_id === 'db2b6493-2f9e-478c-bd34-932a1c287372').length || 0,
    sampleCompanyIds: data?.slice(0, 5).map(e => e.company_id) || [],
    error: error?.message,
  });
}
