import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'CableAlert terms of service — subscription, data, and usage terms.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: 17 May 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Service</h2>
            <p className="text-gray-400">CableAlert (&quot;the Service&quot;) provides real-time subsea cable outage intelligence via Telegram alerts and email digests. The Service is operated by Irfan Dadabhai, trading as CableAlert. By subscribing, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Subscription and payment</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Subscriptions are billed monthly at £50/month via Stripe.</li>
              <li>You may cancel at any time. Access continues until the end of the paid period.</li>
              <li>No refunds for partial months already paid.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice to subscribers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Intelligence accuracy</h2>
            <p className="text-gray-400">CableAlert aggregates publicly available information and applies AI classification. We cannot guarantee the completeness, accuracy, or timeliness of any alert. Alerts are intelligence — not financial advice, trading signals, or operational recommendations. You remain solely responsible for all trading, infrastructure, or operational decisions made in reliance on CableAlert data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Acceptable use</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>You may not redistribute, resell, or sublicence CableAlert alerts or data to third parties.</li>
              <li>You may not use the Service to attempt to access, disrupt, or reverse-engineer underlying scraping infrastructure.</li>
              <li>One subscription covers one user or one organisation&apos;s internal use.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Limitation of liability</h2>
            <p className="text-gray-400">To the fullest extent permitted by law, CableAlert and its operator shall not be liable for any indirect, incidental, or consequential loss arising from use of or reliance on the Service. Our total liability in any 12-month period shall not exceed the subscription fees paid in that period.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Governing law</h2>
            <p className="text-gray-400">These terms are governed by the law of England and Wales. Any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p className="text-gray-400">Questions: <a href="mailto:support@cablealert.io" className="text-sky-400 hover:text-sky-300">support@cablealert.io</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
