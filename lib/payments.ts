// lib/payments.ts — Stripe subscriptions for CableAlert Pro (£50/month)
// Never call Stripe SDK from components — always use this lib

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cablealert.io';

// ── Checkout Session ────────────────────────────────────────

export async function createCheckoutSession(email?: string): Promise<string> {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) throw new Error('STRIPE_PRO_PRICE_ID not set');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/api/auth/callback?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/subscribe`,
    ...(email ? { customer_email: email } : {}),
    billing_address_collection: 'auto',
    automatic_tax: { enabled: true },
    subscription_data: {
      metadata: { source: 'cablealert' },
    },
  });

  return session.url!;
}

// ── Retrieve Checkout Session (used by auth callback) ──────

export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return null;
  }
}

// ── Customer Portal ─────────────────────────────────────────

export async function createPortalSession(stripeCustomerId: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${APP_URL}/dashboard`,
  });
  return session.url;
}

// ── Webhook event parsing ───────────────────────────────────

export function constructWebhookEvent(
  rawBody: string,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

// ── Get subscription details ────────────────────────────────

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// ── MRR calculation ─────────────────────────────────────────

export async function calculateMRR(): Promise<number> {
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100,
  });

  return subscriptions.data.reduce((sum, sub) => {
    const amount = sub.items.data[0]?.plan?.amount ?? 0;
    const interval = sub.items.data[0]?.plan?.interval;
    const monthlyAmount = interval === 'year' ? amount / 12 : amount;
    return sum + monthlyAmount / 100; // pence to pounds
  }, 0);
}
