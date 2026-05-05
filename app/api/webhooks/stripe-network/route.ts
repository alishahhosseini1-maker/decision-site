import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendNetworkConfirmationEmail } from '@/app/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  console.log('[stripe-network webhook] ===== WEBHOOK RECEIVED =====');
  console.log('[stripe-network webhook] Timestamp:', new Date().toISOString());
  console.log('[stripe-network webhook] Signature present:', !!sig);

  if (!sig) {
    console.error('[stripe-network webhook] ERROR: No signature header');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_NETWORK_WEBHOOK_SECRET!
    );
    console.log('[stripe-network webhook] Event type:', event.type);
    console.log('[stripe-network webhook] Event ID:', event.id);
  } catch (err) {
    console.error('[stripe-network webhook] ERROR: Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log('[stripe-network webhook] Session ID:', session.id);
    console.log('[stripe-network webhook] Payment status:', session.payment_status);
    console.log('[stripe-network webhook] Customer email:', session.customer_email);
    console.log('[stripe-network webhook] Amount total:', session.amount_total);
    console.log('[stripe-network webhook] Metadata:', JSON.stringify(session.metadata));

    if (session.payment_status === 'paid') {
      const { first_name, last_name, email, outcome } = session.metadata || {};

      console.log('[stripe-network webhook] Extracted metadata:');
      console.log('[stripe-network webhook]   - first_name:', first_name);
      console.log('[stripe-network webhook]   - last_name:', last_name);
      console.log('[stripe-network webhook]   - email:', email);
      console.log('[stripe-network webhook]   - outcome:', outcome ? outcome.substring(0, 50) + '...' : undefined);

      if (!first_name || !last_name || !email || !outcome) {
        console.error('[stripe-network webhook] ERROR: Missing required metadata fields');
        console.error('[stripe-network webhook] first_name missing?', !first_name);
        console.error('[stripe-network webhook] last_name missing?', !last_name);
        console.error('[stripe-network webhook] email missing?', !email);
        console.error('[stripe-network webhook] outcome missing?', !outcome);
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
      }

      // Check idempotency - don't insert twice
      console.log('[stripe-network webhook] Checking for existing submission...');
      const { data: existing, error: checkError } = await supabase
        .from('network_submissions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[stripe-network webhook] ERROR: Failed to check existing submission:', checkError);
      }

      console.log('[stripe-network webhook] Existing submission found?', !!existing);

      if (!existing) {
        console.log('[stripe-network webhook] Preparing to insert new submission...');
        const insertData = {
          first_name,
          last_name,
          email,
          outcome,
          csv_url: null,
          stripe_session_id: session.id,
          customer_email: session.customer_email || session.customer_details?.email,
          amount_paid: session.amount_total || 0,
        };
        console.log('[stripe-network webhook] Insert data:', JSON.stringify(insertData));

        const { error } = await supabase
          .from('network_submissions')
          .insert(insertData);

        if (error) {
          console.error('[stripe-network webhook] ERROR: Insert failed');
          console.error('[stripe-network webhook] Error code:', error.code);
          console.error('[stripe-network webhook] Error message:', error.message);
          console.error('[stripe-network webhook] Error details:', JSON.stringify(error));
          return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
        }

        console.log('[stripe-network webhook] SUCCESS: Network submission created for:', email);

        // Send confirmation email
        try {
          await sendNetworkConfirmationEmail({
            to: email,
            firstName: first_name,
          });
          console.log('[stripe-network webhook] Confirmation email sent to:', email);
        } catch (emailError) {
          console.error('[stripe-network webhook] Email send failed:', emailError);
          // Don't fail the webhook if email fails - submission is already recorded
        }
      } else {
        console.log('[stripe-network webhook] INFO: Submission already exists for session:', session.id);
      }
    } else {
      console.log('[stripe-network webhook] INFO: Payment status is not "paid", skipping. Status:', session.payment_status);
    }
  } else {
    console.log('[stripe-network webhook] INFO: Event type is not checkout.session.completed, skipping.');
  }

  console.log('[stripe-network webhook] ===== WEBHOOK COMPLETE =====');
  return NextResponse.json({ received: true });
}
