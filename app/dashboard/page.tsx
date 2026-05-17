// app/dashboard/page.tsx — Subscriber dashboard
// No auth gating yet (Session 4 adds full auth)
// Currently checks stripe session_id on first load to confirm subscription

import { createPortalSession } from '@/lib/payments';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard — CableAlert',
};

async function handlePortalAction(formData: FormData): Promise<void> {
  'use server';
  const customerId = formData.get('stripe_customer_id') as string;
  if (!customerId) return;
  const url = await createPortalSession(customerId);
  redirect(url);
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { session_id?: string; error?: string };
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Your dashboard</h1>
        <p className="text-gray-400 text-sm">Manage your CableAlert subscription and Telegram alerts</p>
      </div>

      {searchParams.session_id && (
        <div className="border border-green-700 bg-green-950 text-green-300 rounded-lg p-4 mb-6 text-sm">
          ✅ Subscription confirmed. Welcome to CableAlert — check your email for setup instructions.
        </div>
      )}

      {/* Subscription Status */}
      <div className="border border-gray-800 bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Subscription</h2>
          <span className="text-xs font-bold bg-green-900 text-green-300 px-2 py-0.5 rounded border border-green-700">
            ACTIVE
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-4">CableAlert Pro · £50/month</p>
        <form action={handlePortalAction}>
          <button
            type="submit"
            className="text-sm border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
          >
            Manage subscription →
          </button>
        </form>
      </div>

      {/* Telegram Setup */}
      <div className="border border-gray-800 bg-gray-900 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-white mb-4">Telegram alerts</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-red-900 border border-red-700 text-red-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-sm font-medium text-white">Open Telegram and search for <span className="font-mono text-red-400">@CableAlertBot</span></p>
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
              <form className="flex gap-2" action={async (fd: FormData) => {
                'use server';
                // TODO: wire to updateSubscriberTelegramId server action
                console.log('[dev] Telegram ID submitted:', fd.get('telegram_chat_id'));
              }}>
                <input
                  type="text"
                  name="telegram_chat_id"
                  placeholder="123456789"
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
      </div>

      {/* Alert preferences */}
      <div className="border border-gray-800 bg-gray-900 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-3">Alert preferences</h2>
        <p className="text-sm text-gray-400 mb-4">Currently receiving: critical + high severity alerts on all routes</p>
        <p className="text-xs text-gray-600">Route filtering and severity controls coming in the next update.</p>
      </div>
    </div>
  );
}
