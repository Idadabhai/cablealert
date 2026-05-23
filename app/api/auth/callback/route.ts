// app/api/auth/callback/route.ts
// Handles the Stripe checkout success redirect.
// 1. Retrieves the checkout session from Stripe to get stripe_customer_id.
// 2. Looks up the subscriber in Supabase (webhook may arrive slightly before this).
// 3. If active: sets httpOnly session cookie, redirects to /dashboard.
// 4. If subscriber not yet created (webhook race): redirects to /dashboard?pending=1
//    so the dashboard can show a "verifying..." state.
// 5. Invalid session_id: redirects to /subscribe?error=invalid_session.

import { type NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession } from '@/lib/payments';
import { getSubscriberByStripeCustomer } from '@/lib/db';

const COOKIE_NAME = 'cablealert_sub';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function redirect(req: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, req.url));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return redirect(req, '/subscribe?error=missing_session');
  }

  // Retrieve the checkout session from Stripe
  const session = await getCheckoutSession(sessionId);
  if (!session) {
    return redirect(req, '/subscribe?error=invalid_session');
  }

  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null;

  if (!stripeCustomerId) {
    return redirect(req, '/subscribe?error=no_customer');
  }

  // Look up subscriber — webhook fires ~concurrently, so may not exist yet
  let subscriber = null;
  try {
    subscriber = await getSubscriberByStripeCustomer(stripeCustomerId);
  } catch {
    // DB unavailable — surface gracefully
    return redirect(req, '/subscribe?error=db_error');
  }

  if (!subscriber || subscriber.status !== 'active') {
    // Webhook hasn't fired yet. Send to pending state — dashboard will auto-refresh.
    return redirect(req, `/dashboard?session_id=${sessionId}&pending=1`);
  }

  // Subscriber confirmed active — set session cookie and redirect to dashboard
  const res = redirect(req, '/dashboard');
  res.cookies.set(COOKIE_NAME, subscriber.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}
