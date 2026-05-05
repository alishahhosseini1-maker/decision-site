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
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_NETWORK_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[stripe-network webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const { first_name, last_name, email, outcome } = session.metadata || {};

      if (!first_name || !last_name || !email || !outcome) {
        console.error('[stripe-network webhook] Missing required metadata');
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
      }

      // Check idempotency - don't insert twice
      const { data: existing } = await supabase
        .from('network_submissions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('network_submissions')
          .insert({
            first_name,
            last_name,
            email,
            outcome,
            csv_url: null,
            stripe_session_id: session.id,
            customer_email: session.customer_email || session.customer_details?.email,
            amount_paid: session.amount_total || 0,
          });

        if (error) {
          console.error('[stripe-network webhook] Insert error:', error);
          return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
        }

        console.log('[stripe-network webhook] Network submission created for:', email);
      } else {
        console.log('[stripe-network webhook] Submission already exists for session:', session.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
