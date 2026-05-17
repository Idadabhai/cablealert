// app/api/webhooks/stripe/route.ts
// Handles Stripe subscription lifecycle events
// Must use raw body — Next.js must NOT parse it

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/payments';
import { upsertSubscriber, cancelSubscriber } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email ?? session.customer_details?.email;
        if (!email) break;

        await upsertSubscriber({
          email,
          stripe_customer_id:       session.customer as string,
          stripe_subscription_id:   session.subscription as string,
          status:                   'active',
          telegram_chat_id:         null,
          routes_filter:            null, // all routes
          min_severity:             'high',
        });

        await sendWelcomeEmail(email);
        console.log(`[webhook] New subscriber: ${email}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        // Look up by customer ID — we don't have email directly here
        // The DB fn handles finding by stripe_customer_id
        const { getSubscriberByStripeCustomer } = await import('@/lib/db');
        const subscriber = await getSubscriberByStripeCustomer(customerId);
        if (subscriber) {
          await cancelSubscriber(subscriber.email);
          console.log(`[webhook] Cancelled: ${subscriber.email}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { getSubscriberByStripeCustomer, upsertSubscriber: updateSub } = await import('@/lib/db');
        const subscriber = await getSubscriberByStripeCustomer(customerId);
        if (subscriber) {
          await updateSub({ email: subscriber.email, status: 'past_due' });
          console.log(`[webhook] Payment failed: ${subscriber.email}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { getSubscriberByStripeCustomer, upsertSubscriber: updateSub } = await import('@/lib/db');
        const subscriber = await getSubscriberByStripeCustomer(customerId);
        if (subscriber) {
          const newStatus = sub.status === 'active' ? 'active'
            : sub.status === 'past_due' ? 'past_due'
            : 'cancelled';
          await updateSub({ email: subscriber.email, status: newStatus });
        }
        break;
      }

      default:
        // Unhandled event — log but don't error
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
