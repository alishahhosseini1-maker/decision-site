import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    const { decisionId } = await req.json();

    if (!decisionId) {
      return NextResponse.json({ error: 'Decision ID required' }, { status: 400 });
    }

    // Validate required environment variables
    if (!process.env.STRIPE_PRICE_ID) {
      console.error('[checkout] STRIPE_PRICE_ID not set');
      return NextResponse.json({ error: 'Payment configuration error - missing price ID' }, { status: 500 });
    }

    // Use APP_URL for server-side (not NEXT_PUBLIC_APP_URL which is for client-side)
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('[checkout] APP_URL not set');
      return NextResponse.json({ error: 'Payment configuration error - missing app URL' }, { status: 500 });
    }

    console.log('[checkout] Using APP_URL:', appUrl);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_creation: 'always',
      allow_promotion_codes: true,
      success_url: `${appUrl}/?decision_id=${decisionId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?decision_id=${decisionId}`,
      metadata: {
        decision_id: decisionId,
      },
    });

    console.log('[checkout] Session created successfully:', session.id);
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] Error:', err);
    console.error('[checkout] Error details:', err.message, err.type, err.code);
    return NextResponse.json({
      error: 'Checkout failed',
      details: err.message || 'Unknown error'
    }, { status: 500 });
  }
}
