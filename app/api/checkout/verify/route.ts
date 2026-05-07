import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    console.log('[verify] Received sessionId:', sessionId);

    if (!sessionId) {
      console.error('[verify] No sessionId provided');
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Check if already recorded (idempotency)
    console.log('[verify] Checking for existing payment record...');
    const { data: existing } = await supabase
      .from('decision_payments')
      .select('id, customer_email, user_id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existing) {
      console.log('[verify] Payment already recorded:', existing);
      // Fetch the decision_id from the payment record
      const { data: paymentData } = await supabase
        .from('decision_payments')
        .select('decision_id')
        .eq('stripe_session_id', sessionId)
        .single();

      return NextResponse.json({
        verified: true,
        alreadyRecorded: true,
        email: existing.customer_email,
        hasAccount: !!existing.user_id,
        decisionId: paymentData?.decision_id
      });
    }

    // Verify session with Stripe
    console.log('[verify] Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('[verify] Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      amount: session.amount_total,
      email: session.customer_email || session.customer_details?.email
    });

    if (session.payment_status !== 'paid') {
      console.error('[verify] Payment not completed, status:', session.payment_status);
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const decisionId = session.metadata?.decision_id;
    const customerEmail = session.customer_email || session.customer_details?.email;
    console.log('[verify] Extracted data:', { decisionId, customerEmail });

    if (!decisionId || !customerEmail) {
      console.error('[verify] Missing decisionId or email');
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    // Record payment
    console.log('[verify] Recording payment in database...');
    const { data: insertData, error: insertError } = await supabase
      .from('decision_payments')
      .insert({
        decision_id: decisionId,
        user_id: null,
        stripe_session_id: sessionId,
        customer_email: customerEmail,
        amount: session.amount_total || 0,
        paid_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[verify] Insert error:', insertError);
      console.error('[verify] Insert error details:', JSON.stringify(insertError, null, 2));

      // Check if it's a table not found error
      if (insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Database table not found. Please run the migration SQL in Supabase.',
          details: insertError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        error: 'Failed to record payment',
        details: insertError.message
      }, { status: 500 });
    }

    console.log('[verify] Payment recorded successfully!', insertData);
    return NextResponse.json({
      verified: true,
      email: customerEmail,
      hasAccount: false,
      decisionId: decisionId
    });
  } catch (err) {
    console.error('[verify] Error:', err);
    return NextResponse.json({
      error: 'Verification failed',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
