import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const note = (body.note || '').trim();
    if (!note) {
      return NextResponse.json({ error: 'A dispute note is required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: updated, error } = await supabase
      .from('lumen_evidence')
      .update({ status: 'disputed', dispute_note: note })
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ evidence: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to file dispute.' }, { status: 500 });
  }
}
