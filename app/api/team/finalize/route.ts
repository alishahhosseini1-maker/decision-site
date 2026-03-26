import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTeamSummary } from '@/app/lib/team-summary';
import { sendSummaryEmail } from '@/app/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TeamInputRow = {
  id: string;
  name: string | null;
  department: string;
  moved_forward: string;
  not_working: string;
  needs: string;
  next_action: string | null;
};

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
      if (!session.summary_emailed_at && session.created_by) {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
            session.created_by
          );

          if (userError) {
            throw userError;
          }

          const email = userData?.user?.email;

          if (email) {
            await sendSummaryEmail({
              to: email,
              title: session.title,
              summary: session.summary_json,
            });

            await supabase
              .from('team_sessions')
              .update({
                summary_emailed_at: new Date().toISOString(),
              })
              .eq('id', sessionId);
          }
        } catch (emailErr) {
          console.error('Failed to send summary email for existing summary:', emailErr);
        }
      }

      return NextResponse.json({ ok: true, alreadyFinalized: true });
    }

    const { data: inputs, error: inputsError } = await supabase
      .from('team_inputs')
      .select(
        `
        id,
        name,
        department,
        moved_forward,
        not_working,
        needs,
        next_action
      `
      )
      .eq('session_id', sessionId);

    if (inputsError || !inputs || inputs.length === 0) {
      return NextResponse.json({ error: 'No inputs found' }, { status: 400 });
    }

    const safeInputs = (inputs as TeamInputRow[]).map((input) => ({
      id: input.id,
      name: input.name ?? null,
      department: input.department ?? '',
      moved_forward: input.moved_forward ?? '',
      not_working: input.not_working ?? '',
      needs: input.needs ?? '',
      next_action: input.next_action ?? null,
    }));

    const nowIso = new Date().toISOString();

    if (!session.closed_at) {
      const { error: closeError } = await supabase
        .from('team_sessions')
        .update({
          status: 'complete',
          closed_at: nowIso,
        })
        .eq('id', sessionId);

      if (closeError) {
        return NextResponse.json({ error: closeError.message }, { status: 500 });
      }
    }

    const summary = await generateTeamSummary(safeInputs);

    const { error: summarySaveError } = await supabase
      .from('team_sessions')
      .update({
        summary_json: summary,
        summary_generated_at: nowIso,
      })
      .eq('id', sessionId);

    if (summarySaveError) {
      return NextResponse.json({ error: summarySaveError.message }, { status: 500 });
    }

    if (!session.summary_emailed_at && session.created_by) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          session.created_by
        );

        if (userError) {
          throw userError;
        }

        const email = userData?.user?.email;

        if (email) {
          await sendSummaryEmail({
            to: email,
            title: session.title,
            summary,
          });

          const { error: emailedAtError } = await supabase
            .from('team_sessions')
            .update({
              summary_emailed_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

          if (emailedAtError) {
            console.error('Failed to mark summary email as sent:', emailedAtError);
          }
        }
      } catch (emailErr) {
        console.error('Failed to send summary email:', emailErr);
      }
    }

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}