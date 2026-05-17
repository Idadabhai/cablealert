// app/subscribe/page.tsx — Pricing + Stripe Checkout

import { createCheckoutAction } from '@/actions/create-checkout';

export const metadata = {
  title: 'Subscribe — CableAlert',
  description: 'Subscribe to CableAlert for £50/month. Real-time subsea cable outage alerts via Telegram and email for latency-sensitive traders.',
};

export default function SubscribePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">CableAlert Pro</h1>
        <p className="text-gray-400">Real-time subsea cable intelligence for latency-sensitive traders</p>
      </div>

      {searchParams.error && (
        <div className="border border-red-800 bg-red-950 text-red-300 rounded-lg p-4 mb-6 text-sm">
          Something went wrong with checkout. Please try again or email contact@cablealert.io
        </div>
      )}

      {/* Pricing Card */}
      <div className="border border-red-700 bg-gray-900 rounded-xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Pro Plan</div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-white">£50</span>
              <span className="text-gray-400">/month</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">Billed monthly · Cancel anytime</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Built by</div>
            <div className="text-sm text-gray-300 font-medium">Former Colt Technology</div>
            <div className="text-xs text-gray-500">Wholesale Director</div>
          </div>
        </div>

        <ul className="space-y-3 mb-8">
          {[
            '⚡ Instant Telegram push alerts on critical/high events',
            '📧 Daily 7am UTC email digest',
            '🌐 All major trading routes (London-NY, London-Singapore, London-Tokyo, NYC-São Paulo)',
            '📡 15-minute scrape cycle — before Twitter',
            '⚖️ Claude AI classification — signal not noise',
            '🔧 Self-serve cancellation via Stripe portal',
          ].map(f => (
            <li key={f} className="flex gap-3 text-sm text-gray-300">
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <form action={createCheckoutAction}>
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
          >
            Subscribe — £50/month
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Stripe checkout · Secure payment · Cancel anytime
        </p>
      </div>

      {/* Credibility block */}
      <div className="border border-gray-800 rounded-xl p-6 bg-gray-900">
        <h3 className="font-semibold text-white mb-3">Why this exists</h3>
        <p className="text-sm text-gray-400 leading-relaxed mb-3">
          After 11 years at Colt Technology in Strategic Alliances and Optical/Wholesale, I had direct visibility into
          how subsea cable consortia communicate outages — and how long carriers delay public announcements.
        </p>
        <p className="text-sm text-gray-400 leading-relaxed">
          When a cable cuts, the first 15–60 minutes matter for latency-sensitive positions. By the time
          it&apos;s trending on Twitter, the trade is already closed. CableAlert gives you that window.
        </p>
      </div>
    </div>
  );
}
