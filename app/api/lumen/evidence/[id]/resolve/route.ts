import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const action = body.action === 'uphold' ? 'uphold' : 'dismiss';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const patch =
      action === 'uphold'
        ? { status: 'rejected' as const }
        : { status: 'pending' as const, verified_by: [], dispute_note: null };

    const { data: updated, error } = await supabase
      .from('lumen_evidence')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ evidence: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve dispute.' }, { status: 500 });
  }
}
