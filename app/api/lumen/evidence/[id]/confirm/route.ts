import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { confirmationsNeededFor } from '@/app/lib/lumen';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const contributor = (body.contributor || '').trim();
    if (!contributor) {
      return NextResponse.json({ error: 'Missing contributor identity.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ev, error: fetchError } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (ev.status !== 'pending') {
      return NextResponse.json({ evidence: ev });
    }
    if (ev.contributor === contributor) {
      return NextResponse.json({ error: "You can't confirm your own submission." }, { status: 400 });
    }
    const already: string[] = ev.verified_by || [];
    if (already.includes(contributor)) {
      return NextResponse.json({ evidence: ev });
    }

    const verifiedBy = [...already, contributor];
    const status = verifiedBy.length >= confirmationsNeededFor(ev.source_type) ? 'verified' : 'pending';

    const { data: updated, error: updateError } = await supabase
      .from('lumen_evidence')
      .update({ verified_by: verifiedBy, status })
      .eq('id', params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ evidence: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to confirm evidence.' }, { status: 500 });
  }
}
