import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: history, error } = await supabase
      .from('lumen_valuation_history')
      .select('*')
      .eq('company_id', params.id)
      .order('date', { ascending: true });

    if (error) throw error;

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

    return NextResponse.json({ history: timeline });
  } catch (err: any) {
    console.error('[lumen/valuation-history] error:', err);
    return NextResponse.json({ error: 'Failed to fetch valuation history' }, { status: 500 });
  }
}
