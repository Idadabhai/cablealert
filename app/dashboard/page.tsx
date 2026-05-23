// app/dashboard/page.tsx — Subscriber dashboard
// Auth: httpOnly cookie 'cablealert_sub' set by /api/auth/callback after Stripe checkout.
// Pending state: Stripe webhook may not fire before the callback — show auto-refresh UI.
// Returning subscribers: cookie persists 30 days, no re-auth needed.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createPortalSession } from '@/lib/payments';
import { getSubscriberById, updateSubscriberTelegramId } from '@/lib/db';
import type { Subscriber } from '@/types/db';

export const metadata = {
  title: 'Dashboard — CableAlert',
};

const COOKIE_NAME = 'cablealert_sub';

// ── Server actions ─────────────────────────────────────────────────────────

async function handlePortalAction(formData: FormData): Promise<void> {
  'use server';
  const customerId = formData.get('stripe_customer_id') as string;
  if (!customerId) return;
  const url = await createPortalSession(customerId);
  redirect(url);
}

async function handleTelegramAction(formData: FormData): Promise<void> {
  'use server';
  const subscriberId = formData.get('subscriber_id') as string;
  const telegramChatId = (formData.get('telegram_chat_id') as string).trim();
  if (!subscriberId || !telegramChatId) return;
  // Basic validation — Telegram chat IDs are numeric
  if (!/^\d+$/.test(telegramChatId)) return;
  await updateSubscriberTelegramId(subscriberId, telegramChatId);
  redirect('/dashboard?telegram=connected');
}

// ── Auth helper ────────────────────────────────────────────────────────────

async function getSubscriberFromSession(): Promise<Subscriber | null> {
  const cookieStore = await cookies();
  const subCookie = cookieStore.get(COOKIE_NAME);
  if (!subCookie?.value) return null;
  try {
    return await getSubscriberById(subCookie.value);
  } catch {
    return null;
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { pending?: string; telegram?: string; session_id?: string };
}) {
  // ── Pending state (Stripe webhook race) ──────────────────────────────────
  // Callback redirected here with ?pending=1 because subscriber wasn't in DB yet.
  // Show a verifying UI with meta-refresh. Once webhook fires, refresh resolves auth.
  if (searchParams.pending === '1') {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <head>
          {/* Auto-refresh after 4s — gives webhook time to fire */}
          <meta
            httpEquiv="refresh"
            content={`4;url=/api/auth/callback?session_id=${searchParams.session_id ?? ''}`}
          />
        </head>
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-bold text-white mb-2">Verifying your subscription...</h1>
        <p className="text-gray-400 text-sm">
          Confirming payment with Stripe. This usually takes a few seconds.
        </p>
        <p className="text-gray-600 text-xs mt-4">
          Not redirecting?{' '}
          <a
            href={`/api/auth/callback?session_id=${searchParams.session_id ?? ''}`}
            className="text-red-400 hover:underline"
          >
            Click here to retry
          </a>
        </p>
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const subscriber = await getSubscriberFromSession();
  if (!subscriber || subscriber.status !== 'active') {
    redirect('/subscribe?error=auth_required');
  }

  const telegramConnected = !!subscriber.telegram_chat_id || searchParams.telegram === 'connected';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Your dashboard</h1>
        <p className="text-gray-400 text-sm">
          Manage your CableAlert subscription and Telegram alerts
          <span className="ml-2 text-gray-600">({subscriber.email})</span>
        </p>
      </div>

      {searchParams.telegram === 'connected' && (
        <div className="border border-green-700 bg-green-950 text-green-300 rounded-lg p-4 mb-6 text-sm">
          Telegram connected. You will receive push alerts for critical and high-severity events.
        </div>
      )}

      {/* Subscription Status */}
      <div className="border border-gray-800 bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Subscription</h2>
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${
            subscriber.status === 'active'
              ? 'bg-green-900 text-green-300 border-green-700'
              : subscriber.status === 'past_due'
              ? 'bg-amber-900 text-amber-300 border-amber-700'
              : 'bg-gray-800 text-gray-400 border-gray-700'
          }`}>
            {subscriber.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-4">CableAlert Pro &middot; &pound;50/month</p>
        {subscriber.stripe_customer_id && (
          <form action={handlePortalAction}>
            <input type="hidden" name="stripe_customer_id" value={subscriber.stripe_customer_id} />
            <button
              type="submit"
              className="text-sm border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
            >
              Manage subscription &rarr;
            </button>
          </form>
        )}
      </div>

      {/* Telegram Setup */}
      <div className="border border-gray-800 bg-gray-900 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-white mb-4">Telegram alerts</h2>

        {telegramConnected ? (
          <div className="flex items-center gap-3 p-3 bg-green-950 border border-green-800 rounded-lg">
            <span className="text-green-400 text-lg">&#10003;</span>
            <div>
              <p className="text-sm font-medium text-white">Telegram connected</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Chat ID: {subscriber.telegram_chat_id ?? 'pending confirmation'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-red-900 border border-red-700 text-red-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-sm font-medium text-white">
                  Open Telegram and search for{' '}
                  <span className="font-mono text-red-400">@CableAlertBot</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Then send the command /start</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-red-900 border border-red-700 text-red-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-sm font-medium text-white">Copy your Telegram ID from the bot&apos;s reply</p>
                <p className="text-xs text-gray-500 mt-0.5">It will look like a number: 123456789</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-red-900 border border-red-700 text-red-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-sm font-medium text-white mb-2">Paste your Telegram ID below</p>
                <form action={handleTelegramAction} className="flex gap-2">
                  <input type="hidden" name="subscriber_id" value={subscriber.id} />
                  <input
                    type="text"
                    name="telegram_chat_id"
                    placeholder="123456789"
                    pattern="[0-9]+"
                    required
                    className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                  />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Connect
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert preferences */}
      <div className="border border-gray-800 bg-gray-900 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-3">Alert preferences</h2>
        <p className="text-sm text-gray-400 mb-2">
          Currently receiving:{' '}
          <span className="text-white">
            {subscriber.min_severity === 'critical' ? 'Critical only' : 'Critical + high severity'} alerts
          </span>
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Routes:{' '}
          <span className="text-white">
            {subscriber.routes_filter?.length
              ? subscriber.routes_filter.join(', ')
              : 'All monitored routes'}
          </span>
        </p>
        <p className="text-xs text-gray-600">Route filtering and severity controls coming in the next update.</p>
      </div>
    </div>
  );
}
