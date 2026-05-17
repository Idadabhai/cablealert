import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How CableAlert collects, uses, and protects your personal data.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: 17 May 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Who we are</h2>
            <p>CableAlert is operated by Irfan Dadabhai, trading as CableAlert (&quot;we&quot;, &quot;us&quot;). Our service is available at cablealert.io. For privacy enquiries: <a href="mailto:privacy@cablealert.io" className="text-sky-400 hover:text-sky-300">privacy@cablealert.io</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong className="text-gray-300">Account data:</strong> email address, Telegram chat ID (if you connect Telegram alerts), payment details (processed by Stripe — we never store card numbers).</li>
              <li><strong className="text-gray-300">Usage data:</strong> alert delivery logs, pages visited, browser type, IP address (anonymised after 30 days).</li>
              <li><strong className="text-gray-300">Communications:</strong> emails you send us, support requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How we use it</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>To deliver Telegram alerts and email digests you subscribed to.</li>
              <li>To process your subscription payment via Stripe.</li>
              <li>To improve the service and monitor alert quality.</li>
              <li>To respond to support requests.</li>
            </ul>
            <p className="mt-3 text-gray-400">We do not sell your data to third parties. We do not use your data for advertising.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Legal basis (UK GDPR)</h2>
            <p className="text-gray-400">We process your data under Article 6(1)(b) (contract performance — delivering the service you subscribed to) and Article 6(1)(f) (legitimate interests — service improvement and fraud prevention).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data retention</h2>
            <p className="text-gray-400">We retain account data for 12 months after subscription cancellation, then delete it. Alert delivery logs are retained for 6 months. Anonymised usage analytics may be retained indefinitely.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Third parties</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong className="text-gray-300">Stripe</strong> — payment processing (UK/EU adequacy decision applies).</li>
              <li><strong className="text-gray-300">Resend</strong> — transactional email delivery.</li>
              <li><strong className="text-gray-300">Telegram</strong> — alert delivery via bot API.</li>
              <li><strong className="text-gray-300">Supabase</strong> — database hosting (EU region).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Your rights</h2>
            <p className="text-gray-400">Under UK GDPR you have the right to access, correct, port, or delete your personal data. To exercise any right, email <a href="mailto:privacy@cablealert.io" className="text-sky-400 hover:text-sky-300">privacy@cablealert.io</a>. You have the right to lodge a complaint with the ICO (ico.org.uk).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
            <p className="text-gray-400">We use session cookies necessary for authentication. We do not use advertising cookies or third-party tracking cookies.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
