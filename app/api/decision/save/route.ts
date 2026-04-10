import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
        ignoreDuplicates: true,
      })
      .select('id')
      .maybeSingle();

    if (error) throw error;

    // If ignoreDuplicates suppressed the insert, fetch the existing row by request_key
    let id = data?.id;
    if (!id && body.requestKey) {
      const { data: existing } = await supabase
        .from('decisions')
        .select('id')
        .eq('request_key', body.requestKey)
        .maybeSingle();
      id = existing?.id ?? null;
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