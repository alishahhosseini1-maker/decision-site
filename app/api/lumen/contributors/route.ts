import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: evidence, error } = await supabase.from('lumen_evidence').select('contributor, status');
    if (error) throw error;

    const stats = new Map<string, { total: number; verified: number; rejected: number }>();
    for (const e of evidence || []) {
      const s = stats.get(e.contributor) || { total: 0, verified: 0, rejected: 0 };
      s.total += 1;
      if (e.status === 'verified') s.verified += 1;
      if (e.status === 'rejected') s.rejected += 1;
      stats.set(e.contributor, s);
    }

    const contributors = Array.from(stats.entries())
      .map(([name, s]) => {
        const decided = s.verified + s.rejected;
        const accuracy = decided > 0 ? Math.round((s.verified / decided) * 100) : null;
        return { name, ...s, accuracy };
      })
      .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1) || b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({ contributors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load contributors.' }, { status: 500 });
  }
}
