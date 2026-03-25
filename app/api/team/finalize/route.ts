import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTeamSummary } from '@/app/lib/team-summary';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('team_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.summary_generated_at && session.summary_json) {
      return NextResponse.json({ ok: true, alreadyFinalized: true });
    }

    const { data: inputs, error: inputsError } = await supabase
      .from('team_inputs')
      .select('*')
      .eq('session_id', sessionId);

    if (inputsError || !inputs || inputs.length === 0) {
      return NextResponse.json({ error: 'No inputs found' }, { status: 400 });
    }

    if (!session.closed_at) {
      await supabase
        .from('team_sessions')
        .update({
          status: 'complete',
          closed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }

    const summary = await generateTeamSummary(inputs);

    await supabase
      .from('team_sessions')
      .update({
        summary_json: summary,
        summary_generated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (!session.summary_emailed_at) {
      console.log('TODO: send email');

      await supabase
        .from('team_sessions')
        .update({
          summary_emailed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}