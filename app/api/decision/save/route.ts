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

    const { data, error } = await supabase
      .from('decisions')
      .insert({
        decision: body.decision,
        context: body.context,
        score: body.score,
        verdict: body.verdict,

        // structured decision fields
        door: body.door ?? null,
        hinge: body.hinge ?? null,
        trap: body.trap ?? null,
        step: body.step ?? null,

        outcome_status: 'awaiting_outcome',
        needs_follow_up: false,
        exclude_from_patterns: false,
        user_id: body.userId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      id: data.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Save failed.' },
      { status: 500 }
    );
  }
}