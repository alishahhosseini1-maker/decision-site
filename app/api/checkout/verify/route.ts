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

      // If user_id exists, generate temporary credentials for returning user
      let authSession = null;
      if (existing.user_id && existing.customer_email) {
        try {
          const tempPassword = `temp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
          console.log('[verify] Generating temporary password for existing user');

          const { error: updateError } = await supabase.auth.admin.updateUserById(existing.user_id, {
            password: tempPassword,
          });

          if (!updateError) {
            authSession = {
              email: existing.customer_email,
              password: tempPassword,
              type: 'password',
            };
            console.log('[verify] Generated credentials for existing user');
          } else {
            console.log('[verify] Failed to update password for existing user:', updateError);
          }
        } catch (authErr) {
          console.error('[verify] Failed to generate credentials for existing user:', authErr);
        }
      }

      const existingResponse = {
        verified: true,
        alreadyRecorded: true,
        email: existing.customer_email,
        hasAccount: !!existing.user_id,
        decisionId: paymentData?.decision_id,
        session: authSession ? {
          email: authSession.email,
          password: authSession.password,
          type: authSession.type,
        } : null,
      };

      console.log('[verify] Returning existing payment response:', {
        verified: existingResponse.verified,
        hasAccount: existingResponse.hasAccount,
        hasSession: !!existingResponse.session,
        sessionHasPassword: !!existingResponse.session?.password,
      });

      return NextResponse.json(existingResponse);
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

    // Create or get Supabase user and generate temporary credentials for auto-authentication
    console.log('[verify] Creating/getting Supabase user for auto-authentication...');
    let authSession = null;

    try {
      // Generate a random temporary password
      const tempPassword = `temp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      console.log('[verify] Generated temporary password for auto-signin');

      // Get or create user by email
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(u => u.email === customerEmail);

      let userId: string;

      if (!existingUser) {
        // User doesn't exist, create them with temporary password
        console.log('[verify] User not found, creating new user with password...');
        const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
          email: customerEmail,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email since they paid
        });

        if (createError || !newUserData.user) {
          console.error('[verify] Failed to create user:', createError);
          throw createError;
        }

        userId = newUserData.user.id;
        console.log('[verify] Created new user:', userId);
      } else {
        // User exists, update their password to the temporary one
        userId = existingUser.id;
        console.log('[verify] Found existing user, updating password...');

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: tempPassword,
        });

        if (updateError) {
          console.error('[verify] Failed to update user password:', updateError);
          throw updateError;
        }

        console.log('[verify] Updated existing user password');
      }

      // Return credentials for frontend to use signInWithPassword
      authSession = {
        email: customerEmail,
        password: tempPassword,
        type: 'password',
      };
      console.log('[verify] Generated auth credentials successfully');

      // Update the payment record with user_id
      await supabase
        .from('decision_payments')
        .update({ user_id: userId })
        .eq('stripe_session_id', sessionId);

    } catch (authErr) {
      console.error('[verify] Auth session creation failed, but payment was recorded:', authErr);
      // Don't fail the whole request - payment is still valid
    }

    const response = {
      verified: true,
      email: customerEmail,
      hasAccount: !!authSession,
      decisionId: decisionId,
      session: authSession ? {
        email: authSession.email,
        password: authSession.password,
        type: authSession.type,
      } : null,
    };

    console.log('[verify] Returning response:', {
      verified: response.verified,
      hasAccount: response.hasAccount,
      hasSession: !!response.session,
      sessionHasPassword: !!response.session?.password,
      decisionId: response.decisionId,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[verify] Error:', err);
    return NextResponse.json({
      error: 'Verification failed',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
