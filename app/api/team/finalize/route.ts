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

type TeamSummaryShape = {
  executive_signal?: string;
  decision?: string;
  tension?: string;
  recommended_move?: string;
  tradeoff?: string;
  confidence_score?: number;
  confidence_reason?: string;
  projection_14d?: string;
  contradictions?: string | null;
  operating?: {
    working?: string[];
    breaking?: string[];
    top_risk?: string;
  };
  leadership_edge?: string;
  raw_inputs?: Array<{
    name: string | null;
    department: string;
    moved_forward: string;
    not_working: string;
    needs: string;
    next_action: string | null;
  }>;
};

function normalizeSummary(
  summary: unknown,
  safeInputs: Array<{
    name: string | null;
    department: string;
    moved_forward: string;
    not_working: string;
    needs: string;
    next_action: string | null;
  }>
): TeamSummaryShape {
  const s = (summary ?? {}) as Record<string, any>;

  return {
    executive_signal:
      typeof s.executive_signal === 'string' && s.executive_signal.trim()
        ? s.executive_signal.trim()
        : 'The team is showing progress, but leadership attention is needed to remove friction and keep momentum intact.',

    decision:
      typeof s.decision === 'string' && s.decision.trim()
        ? s.decision.trim()
        : 'Review the most immediate blocker and make a clear ownership decision.',

    tension:
      typeof s.tension === 'string' && s.tension.trim()
        ? s.tension.trim()
        : 'If the current friction is left unresolved, progress may continue unevenly and compound into slower execution.',

    recommended_move:
      typeof s.recommended_move === 'string' && s.recommended_move.trim()
        ? s.recommended_move.trim()
        : 'Address the primary operational blocker, assign ownership, and confirm the next action now.',

    tradeoff:
      typeof s.tradeoff === 'string' && s.tradeoff.trim()
        ? s.tradeoff.trim()
        : 'Solving this may require budget, time, or attention that would otherwise stay allocated elsewhere.',

    confidence_score:
      typeof s.confidence_score === 'number'
        ? Math.max(0, Math.min(100, s.confidence_score))
        : 72,

    confidence_reason:
      typeof s.confidence_reason === 'string' && s.confidence_reason.trim()
        ? s.confidence_reason.trim()
        : 'Signal is directionally clear, though some inputs may still lack full detail.',

    projection_14d:
      typeof s.projection_14d === 'string' && s.projection_14d.trim()
        ? s.projection_14d.trim()
        : 'If nothing changes over the next 14 days, current friction will likely continue to drag on execution and team effectiveness.',

    contradictions:
      typeof s.contradictions === 'string' && s.contradictions.trim()
        ? s.contradictions.trim()
        : null,

    operating: {
      working: Array.isArray(s?.operating?.working)
        ? s.operating.working.filter((item: unknown) => typeof item === 'string' && item.trim())
        : [],
      breaking: Array.isArray(s?.operating?.breaking)
        ? s.operating.breaking.filter((item: unknown) => typeof item === 'string' && item.trim())
        : [],
      top_risk:
        typeof s?.operating?.top_risk === 'string' && s.operating.top_risk.trim()
          ? s.operating.top_risk.trim()
          : 'Unresolved operational friction weakens momentum and creates preventable execution drag.',
    },

    leadership_edge:
      typeof s.leadership_edge === 'string' && s.leadership_edge.trim()
        ? s.leadership_edge.trim()
        : 'The issue is usually not effort. It is hidden friction. Leaders gain leverage fastest by removing recurring blockers, not by demanding more activity.',

    raw_inputs: safeInputs,
  };
}

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

      return NextResponse.json({ ok: true, alreadyFinalized: true, summary: session.summary_json });
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

    const generatedSummary = await generateTeamSummary(safeInputs);
    const summary = normalizeSummary(generatedSummary, safeInputs);

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