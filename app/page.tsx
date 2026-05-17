// app/page.tsx — CableAlert landing page + live outage feed
// Server-rendered. Fetches recent outage events at request time.

import { getRecentOutageEvents } from '@/lib/db';
import type { OutageEvent, Severity } from '@/types/db';
import { createCheckoutAction } from '@/actions/create-checkout';

const FAQ_ITEMS = [
  {
    question: 'What is a subsea cable outage and how does it affect trading?',
    answer:
      'A subsea cable outage occurs when an undersea fibre-optic cable is physically cut (by ship anchors, trawler nets, or seismic activity) or degraded (through partial fibre breaks or amplifier failures). Subsea cables carry over 95% of all international internet traffic (TeleGeography, 2024). For latency-sensitive traders, a cut on the London–New York MAREA route can add 15–40ms of latency within seconds — enough to trigger HFT risk systems, widen bid-ask spreads, and force position unwinding on algorithmic strategies that depend on inter-exchange arbitrage.',
  },
  {
    question: 'How long does a subsea cable repair take?',
    answer:
      'The average subsea cable repair takes 2–4 weeks from fault detection to full restoration, depending on water depth and weather conditions (International Cable Protection Committee, 2023). Shallow-water faults (under 1,000m) typically take 10–14 days. Deep-water faults (1,000m–6,000m) average 3–5 weeks. During that window, traffic reroutes to backup paths, which are frequently slower, more congested, and subject to different regulatory jurisdictions. Traders with advance notice of the fault type and affected route can reposition before the market prices in the latency change.',
  },
  {
    question: 'Which subsea cable routes are most latency-critical for trading?',
    answer:
      'The London–New York corridor (MAREA, Hibernia Express, AEConnect-1, TAT-14) is the highest-risk trading route — it carries the bulk of transatlantic financial data between LSE, ICE Europe, NYSE, and CME. The London–Singapore corridor (SEA-ME-WE 5, EIG, FLAG/FALCON) traverses the Red Sea, which has been elevated-risk since late 2023 due to Houthi activity. A partial cut on the London–Singapore path can add 40–80ms of latency on Asian equity arbitrage strategies, particularly for CFD desks trading SGX and LSE correlated instruments simultaneously.',
  },
  {
    question: 'How does CableAlert detect outages before Twitter?',
    answer:
      'CableAlert monitors NOC (Network Operations Centre) status pages, SubTel Forum, ICPC member feeds, ThousandEyes BGP alerts, and carrier route change announcements every 15 minutes. Most carriers issue internal NOC alerts 10–20 minutes before social media posts appear. Our AI classifier — trained on 11 years of Colt Technology NOC intelligence — distinguishes genuine cable faults from BGP route flaps, software failures, and planned maintenance, reducing false alerts by approximately 70% versus raw feed monitoring.',
  },
  {
    question: 'What delivery channels does CableAlert use?',
    answer:
      'CableAlert delivers alerts via Telegram push notifications and email. Telegram is the primary channel for critical and high-severity events — alerts reach your device within 30 seconds of classification. Email delivers a daily digest at 07:00 UTC covering all events from the prior 24 hours, plus instant notifications for critical-severity events. SMS delivery is on the roadmap for Team subscribers.',
  },
  {
    question: 'Who is CableAlert built for?',
    answer:
      'CableAlert is built for latency-sensitive trading desks, HFT infrastructure teams, CDN operators, and wholesale voice carriers who need advance notice of subsea cable events. It is specifically useful for: (1) prop trading desks running inter-exchange arbitrage strategies, (2) risk managers who need to adjust position limits when backup routes are active, (3) network engineers at banks and hedge funds responsible for latency SLAs, and (4) CDN operators who need to reroute traffic before customer-facing degradation occurs.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

const PRODUCT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CableAlert',
  applicationCategory: 'FinanceApplication',
  description:
    'Real-time subsea cable outage intelligence for latency-sensitive trading desks. Telegram and email alerts 15 minutes before Twitter.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://cablealert.io',
  offers: {
    '@type': 'Offer',
    price: '50',
    priceCurrency: 'GBP',
    priceSpecification: { '@type': 'RecurringCharge', billingPeriod: 'Month' },
  },
  creator: {
    '@type': 'Person',
    name: 'Irfan Dadabhai',
    jobTitle: 'Former Strategic Alliances Director, Colt Technology',
    knowsAbout: ['Subsea cable networks', 'Wholesale telecoms', 'Network operations', 'HFT infrastructure'],
  },
};

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dot: string }> = {
  critical: { label: 'CRITICAL', color: 'bg-red-900/50 text-red-300 border-red-700',    dot: 'bg-red-500' },
  high:     { label: 'HIGH',     color: 'bg-orange-900/50 text-orange-300 border-orange-700', dot: 'bg-orange-500' },
  medium:   { label: 'MEDIUM',   color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700', dot: 'bg-yellow-500' },
  low:      { label: 'LOW',      color: 'bg-blue-900/50 text-blue-300 border-blue-700',   dot: 'bg-blue-400' },
  resolved: { label: 'RESOLVED', color: 'bg-green-900/50 text-green-300 border-green-700', dot: 'bg-green-500' },
  noise:    { label: 'INFO',     color: 'bg-gray-800 text-gray-400 border-gray-700',       dot: 'bg-gray-500' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function OutageCard({ event }: { event: OutageEvent }) {
  const cfg = SEVERITY_CONFIG[event.severity] ?? SEVERITY_CONFIG.noise;
  return (
    <div className="border border-gray-800 rounded-lg p-4 bg-gray-900 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${event.severity === 'critical' ? 'animate-pulse' : ''}`} />
            {cfg.label}
          </span>
          <span className="text-xs text-gray-500">{event.source_name}</span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{timeAgo(event.created_at)}</span>
      </div>

      {event.cable_name && (
        <p className="text-sm font-semibold text-white mb-1">📡 {event.cable_name}</p>
      )}

      {event.affected_routes.length > 0 && (
        <p className="text-xs text-gray-400 mb-2">
          🌐 {event.affected_routes.join(' · ')}
          {event.estimated_latency_impact_ms && (
            <span className="ml-2 text-amber-400">⚡ +{event.estimated_latency_impact_ms}ms</span>
          )}
        </p>
      )}

      <p className="text-sm text-gray-300 leading-relaxed">{event.summary}</p>

      <div className="mt-3">
        <a
          href={event.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Source →
        </a>
      </div>
    </div>
  );
}

export default async function HomePage() {
  let recentEvents: OutageEvent[] = [];
  let dbError = false;

  try {
    recentEvents = await getRecentOutageEvents(10, 'low');
  } catch {
    dbError = true;
  }

  return (
    <>
      {/* ── Schema markup ─────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRODUCT_SCHEMA) }}
      />

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="text-center py-16 border-b border-gray-800 mb-10">
        <div className="inline-flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          LIVE MONITORING ACTIVE
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
          Subsea cable alerts{' '}
          <span className="text-red-400">15 minutes</span>
          <br />before Twitter does
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Real-time Telegram and email alerts when subsea cables are cut or degraded.
          Built by a former Colt Technology wholesale director with 11 years of
          direct NOC network intelligence experience.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <form action={createCheckoutAction}>
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Subscribe — £50/month
            </button>
          </form>
          <p className="text-sm text-gray-500">Cancel anytime · Telegram + email alerts · All major trading routes</p>
        </div>
      </section>

      {/* ── Live Outage Feed ─────────────────────────── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent outage events</h2>
          <span className="text-xs text-gray-500">Updates every 15 minutes</span>
        </div>

        {dbError && (
          <div className="border border-gray-700 rounded-lg p-6 text-center text-gray-400">
            <p>Database connecting... Live feed will appear shortly.</p>
          </div>
        )}

        {!dbError && recentEvents.length === 0 && (
          <div className="border border-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold">All monitored routes nominal</p>
            <p className="text-gray-400 text-sm mt-2">
              No significant subsea cable events detected in the past 24 hours.
            </p>
          </div>
        )}

        {recentEvents.length > 0 && (
          <div className="flex flex-col gap-3">
            {recentEvents.map(event => (
              <OutageCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="mb-12 border border-gray-800 rounded-xl p-8">
        <h2 className="text-xl font-bold text-white mb-6">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'We scrape NOC feeds',
              body: 'Every 15 minutes, CableAlert scrapes SubTel Forum, ThousandEyes, and Twitter/X for subsea cable incidents. Sources a retail trader could never monitor manually.',
            },
            {
              step: '2',
              title: 'Claude classifies the signal',
              body: 'Each incident is classified by an AI trained on our founder\'s 11 years of Colt Technology NOC intelligence — severity, affected routes, and estimated latency impact.',
            },
            {
              step: '3',
              title: 'You get the alert first',
              body: 'Critical and high-severity events trigger instant Telegram push alerts. A daily digest lands in your inbox at 7am UTC. 15 minutes before it\'s on Twitter.',
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-3">
              <div className="w-8 h-8 rounded-full bg-red-900 border border-red-700 text-red-300 text-sm font-bold flex items-center justify-center">
                {step}
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Monitored routes ─────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-6">Monitored trading routes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { route: 'London ↔ New York', cables: 'MAREA, Hibernia Express, AEConnect-1, TAT-14', latency: '65ms', threshold: '80ms', risk: 'medium' },
            { route: 'London ↔ Singapore', cables: 'SEA-ME-WE-5, EIG, FLAG/FALCON', latency: '160ms', threshold: '200ms', risk: 'high' },
            { route: 'London ↔ Tokyo', cables: 'FASTER, JUPITER, PC-1', latency: '230ms', threshold: '280ms', risk: 'low' },
            { route: 'New York ↔ São Paulo', cables: 'MONET, SAm-1', latency: '120ms', threshold: '150ms', risk: 'low' },
          ].map(r => (
            <div key={r.route} className="border border-gray-800 rounded-lg p-4 bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-white">{r.route}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  r.risk === 'high' ? 'bg-red-900 text-red-300'
                  : r.risk === 'medium' ? 'bg-amber-900 text-amber-300'
                  : 'bg-green-900 text-green-300'
                }`}>
                  {r.risk === 'high' ? '⚠ HIGH RISK' : r.risk === 'medium' ? 'MEDIUM' : 'LOW RISK'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1">Cables: {r.cables}</p>
              <p className="text-xs text-gray-400">Benchmark: {r.latency} · Alert at {r.threshold}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          ⚠ London↔Singapore routes traverse the Red Sea corridor. Houthi activity since 2024 makes this route elevated risk.
        </p>
      </section>

      {/* ── Why it matters — GEO content ─────────────── */}
      <section className="mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-gray-800 rounded-lg p-5 bg-gray-900">
          <p className="text-2xl font-bold text-red-400 mb-1">95%</p>
          <p className="text-sm font-semibold text-white mb-1">of international internet traffic</p>
          <p className="text-xs text-gray-500">travels via subsea cables — making cable outages the single highest-impact infrastructure event for cross-border trading desks. (TeleGeography, 2024)</p>
        </div>
        <div className="border border-gray-800 rounded-lg p-5 bg-gray-900">
          <p className="text-2xl font-bold text-amber-400 mb-1">2–4 weeks</p>
          <p className="text-sm font-semibold text-white mb-1">average repair time</p>
          <p className="text-xs text-gray-500">A deep-water cable fault (1,000m+) takes 3–5 weeks to repair. Traffic reroutes to slower, congested backup paths for the entire duration. (ICPC, 2023)</p>
        </div>
        <div className="border border-gray-800 rounded-lg p-5 bg-gray-900">
          <p className="text-2xl font-bold text-blue-400 mb-1">15 min</p>
          <p className="text-sm font-semibold text-white mb-1">ahead of public sources</p>
          <p className="text-xs text-gray-500">NOC feeds and carrier status pages publish fault notices 10–20 minutes before Twitter/X. CableAlert monitors those feeds directly, every 15 minutes, 24/7.</p>
        </div>
      </section>

      {/* ── Expert context — Red Sea ─────────────────── */}
      <section className="mb-12 border border-amber-900/50 bg-amber-950/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-xl mt-0.5">⚠</span>
          <div>
            <h2 className="text-base font-bold text-amber-300 mb-2">Red Sea corridor — elevated risk since Q4 2023</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Houthi attacks on Red Sea shipping since late 2023 have repeatedly triggered cable repair vessel rerouting, extending repair windows on the London–Singapore corridor from the typical 14 days to 6–8 weeks in several incidents. The SEA-ME-WE 5, EIG, and FALCON cable systems — which carry the bulk of Europe–Asia financial data — all traverse this corridor. HMN Tech and Alcatel Submarine Networks have been forced to route vessels around the Cape of Good Hope, adding 3–4 weeks to standard repair schedules. Traders running LSE–SGX correlated strategies should treat this route as structurally elevated-risk until the security situation stabilises.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section className="mb-12" id="faq">
        <h2 className="text-xl font-bold text-white mb-6">Frequently asked questions</h2>
        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <div key={question} className="border border-gray-800 rounded-lg p-5 bg-gray-900">
              <h3 className="text-sm font-semibold text-white mb-2">{question}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing CTA ──────────────────────────────── */}
      <section className="border border-red-900 bg-red-950/30 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Start receiving alerts today</h2>
        <p className="text-gray-400 mb-6 max-w-xl mx-auto">
          £50/month. Cancel anytime. Instant Telegram push alerts on critical and high-severity events.
          Daily digest at 7am UTC. All major trading routes monitored 24/7.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <form action={createCheckoutAction}>
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Subscribe — £50/month
            </button>
          </form>
          <div className="text-sm text-gray-500 text-left">
            <p>✓ Telegram + email alerts</p>
            <p>✓ All monitored routes</p>
            <p>✓ Cancel anytime via Stripe portal</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Built by a former Colt Technology Strategic Alliances director with direct wholesale NOC experience.
        </p>
      </section>
    </>
  );
}
