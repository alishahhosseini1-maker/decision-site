import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    console.log('[load-recent] 🔍 Request received');
    console.log('[load-recent] User ID:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Query for most recent unlocked verdict (less than 7 days old)
    // A decision is "unlocked/not committed" when commitment is null
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('[load-recent] Query filters:');
    console.log('[load-recent]   - user_id =', userId);
    console.log('[load-recent]   - commitment IS NULL (not committed yet)');
    console.log('[load-recent]   - created_at >=', sevenDaysAgo.toISOString());

    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .is('commitment', null)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[load-recent] ❌ Query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    console.log('[load-recent] 📦 Query result:', data ? 'Found decision' : 'No decision found');
    if (data) {
      console.log('[load-recent] Decision ID:', data.id);
      console.log('[load-recent] Decision:', data.decision?.slice(0, 50));
      console.log('[load-recent] Commitment:', data.commitment ? 'Has commitment' : 'null (unlocked)');
      console.log('[load-recent] User ID:', data.user_id);
      console.log('[load-recent] Created at:', data.created_at);
      console.log('[load-recent] Has review_result?:', !!data.review_result);
      console.log('[load-recent] Has verdict?:', !!data.verdict);
      console.log('[load-recent] FULL DATA OBJECT:', JSON.stringify(data, null, 2));
    }

    if (!data) {
      console.log('[load-recent] ℹ️ Returning null (no unlocked verdict found)');
      return NextResponse.json({ decision: null }, { status: 200 });
    }

    // Return the full decision data for restoration
    const responsePayload = {
      id: data.id,
      decision: data.decision,
      context: data.context,
      score: data.score,
      clarity: data.readiness_clarity,
      assumptions: data.readiness_assumptions,
      reversibility: data.readiness_reversibility,
      risk: data.readiness_risk,
      exitLogic: data.readiness_exit_logic,
      rationale: {
        clarity: data.readiness_rationale_clarity,
        assumptions: data.readiness_rationale_assumptions,
        reversibility: data.readiness_rationale_reversibility,
        risk: data.readiness_rationale_risk,
        exitLogic: data.readiness_rationale_exit_logic,
      },
      verdict: data.verdict,
      door: data.door,
      hinge: data.hinge,
      lock: data.lock,
      trap: data.trap,
      exit: data.exit,
      step: data.step,
      script: data.script,
      tripwire: data.tripwire,
      failure_modes: data.failure_modes,
      if_delayed: data.if_delayed,
      what_others_miss: data.what_others_miss,
      deepReview: data.deep_review,
      finalThoughts: data.final_thoughts,
      reviewResult: data.review_result,
      requestKey: data.request_key,
    };

    console.log('[load-recent] 📤 Returning payload:');
    console.log('[load-recent]   - id:', responsePayload.id);
    console.log('[load-recent]   - decision:', responsePayload.decision?.slice(0, 50));
    console.log('[load-recent]   - reviewResult exists?:', !!responsePayload.reviewResult);
    console.log('[load-recent]   - verdict exists?:', !!responsePayload.verdict);

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error('[load-recent] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load recent decision' },
      { status: 500 }
    );
  }
}
