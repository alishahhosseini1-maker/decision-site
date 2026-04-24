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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const decisionId = session.metadata?.decision_id;
      const customerEmail = session.customer_email || session.customer_details?.email;

      if (!decisionId || !customerEmail) {
        console.error('[webhook] Missing decision ID or email');
        return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
      }

      // Check idempotency
      const { data: existing } = await supabase
        .from('decision_payments')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('decision_payments')
          .insert({
            decision_id: decisionId,
            user_id: null,
            stripe_session_id: session.id,
            customer_email: customerEmail,
            amount: session.amount_total || 0,
            paid_at: new Date().toISOString(),
          });

        if (error) {
          console.error('[webhook] Insert error:', error);
          return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
