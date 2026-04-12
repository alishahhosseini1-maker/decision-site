import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const insertPayload = {
      decision: body.decision,
      context: body.context,
      score: body.score,
      verdict: body.verdict,

      // readiness factors
      readiness_clarity: body.clarity ?? null,
      readiness_assumptions: body.assumptions ?? null,
      readiness_reversibility: body.reversibility ?? null,
      readiness_risk: body.risk ?? null,
      readiness_exit_logic: body.exitLogic ?? null,

      // structured decision fields
      door: body.door ?? null,
      hinge: body.hinge ?? null,
      trap: body.trap ?? null,
      step: body.step ?? null,

      // deep review and notes
      deep_review: body.deep_review ?? null,
      final_thoughts: body.final_thoughts ?? null,

      outcome_status: 'awaiting_outcome',
      needs_follow_up: false,
      exclude_from_patterns: false,
      user_id: body.userId || null,
      ...(body.requestKey ? { request_key: body.requestKey } : {}),
    };

    const { data, error } = await supabase
      .from('decisions')
      .upsert(insertPayload, {
        onConflict: 'request_key',
      })
      .select('id')
      .maybeSingle();

    if (error) throw error;

    const id = data?.id ?? null;

    try {
      await resend.emails.send({
        from: 'notifications@decisionlayer.dev',
        to: 'alishahhosseini1@gmail.com',
        subject: `New decision: ${body.decision?.slice(0, 60)}`,
        html: `<p><strong>Decision:</strong> ${body.decision}</p>
<p><strong>Context:</strong> ${body.context || 'None provided'}</p>
<p><strong>Score:</strong> ${body.score}</p>
<p><strong>Verdict:</strong> ${body.verdict || 'Not yet generated'}</p>`,
      });
    } catch (emailErr) {
      console.error('[decision/save] notification email failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Save failed.' },
      { status: 500 }
    );
  }
}