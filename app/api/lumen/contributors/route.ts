import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeContributorStats } from '@/app/lib/lumen';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: evidence, error } = await supabase.from('lumen_evidence').select('contributor, status');
    if (error) throw error;

    const contributors = Array.from(computeContributorStats(evidence || []).values())
      .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1) || b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({ contributors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load contributors.' }, { status: 500 });
  }
}
