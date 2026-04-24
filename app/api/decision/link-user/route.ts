import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { decisionId, userId } = await req.json();

    if (!decisionId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Update decision to associate with user
    const { error } = await supabase
      .from('decisions')
      .update({ user_id: userId })
      .eq('id', decisionId)
      .is('user_id', null);

    if (error) {
      console.error('[link-user] Error:', error);
      return NextResponse.json({ error: 'Failed to link decision' }, { status: 500 });
    }

    // Also update payment record
    await supabase
      .from('decision_payments')
      .update({ user_id: userId })
      .eq('decision_id', decisionId)
      .is('user_id', null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[link-user] Error:', err);
    return NextResponse.json({ error: 'Failed to link decision' }, { status: 500 });
  }
}
