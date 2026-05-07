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
    const { firstName, lastName, email, outcome } = await req.json();

    if (!firstName || !lastName || !email || !outcome) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('[network-checkout] APP_URL not set');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Network Intelligence Analysis — 48 hour delivery',
              description: 'Prioritized analysis of your LinkedIn network opportunities',
            },
            unit_amount: 50000, // $500.00
          },
          quantity: 1,
        },
      ],
      customer_creation: 'always',
      customer_email: email,
      allow_promotion_codes: true,
      discounts: [
        {
          promotion_code: 'promo_1TUXlVIePH9FZTCMLir2HHDh', // FOUNDING13
        },
      ],
      success_url: `${appUrl}/network/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/network`,
      metadata: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        outcome: outcome,
      },
    });

    console.log('[network-checkout] Session created:', session.id);
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[network-checkout] Error:', err);
    return NextResponse.json({
      error: 'Checkout failed',
      details: err.message || 'Unknown error'
    }, { status: 500 });
  }
}
