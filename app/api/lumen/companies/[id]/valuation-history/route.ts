import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[valuation-history] Querying for company_id:', params.id);
    console.log('[valuation-history] company_id type:', typeof params.id);
    console.log('[valuation-history] company_id length:', params.id?.length);

    // Try query without filter first to see if table is readable
    const { data: allRows } = await supabase
      .from('lumen_valuation_history')
      .select('*')
      .limit(10);

    console.log('[valuation-history] Total rows accessible:', allRows?.length || 0);

    const { data: history, error } = await supabase
      .from('lumen_valuation_history')
      .select('*')
      .eq('company_id', params.id)
      .order('date', { ascending: true });

    console.log('[valuation-history] Filtered query returned:', history?.length || 0, 'rows');
    console.log('[valuation-history] First filtered row company_id:', history?.[0]?.company_id);
    if (error) {
      console.error('[valuation-history] Query error:', error);
      throw error;
    }

    // Group by date to handle multiple valuations on same day
    // (e.g., last_round and secondary on same date)
    const grouped: Record<string, any> = {};

    for (const item of history || []) {
      if (!grouped[item.date]) {
        grouped[item.date] = {
          date: item.date,
          last_round: null,
          secondary: null,
          ai_estimated: null,
        };
      }

      if (item.valuation_type === 'last_round') {
        grouped[item.date].last_round = item.value;
      } else if (item.valuation_type === 'secondary') {
        grouped[item.date].secondary = item.value;
      } else if (item.valuation_type === 'ai_estimated') {
        grouped[item.date].ai_estimated = item.value;
      }
    }

    const timeline = Object.values(grouped).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Debug: include detailed info in response
    return NextResponse.json({
      history: timeline,
      debug: {
        company_id: params.id,
        company_id_type: typeof params.id,
        company_id_length: params.id?.length,
        total_rows_accessible: allRows?.length || 0,
        raw_count: history?.length || 0,
        grouped_count: timeline.length,
        first_row_company_id: history?.[0]?.company_id,
        sample_all_rows: allRows?.slice(0, 2).map(r => ({ id: r.id, company_id: r.company_id }))
      }
    });
  } catch (err: any) {
    console.error('[lumen/valuation-history] error:', err);
    return NextResponse.json({ error: 'Failed to fetch valuation history' }, { status: 500 });
  }
}
