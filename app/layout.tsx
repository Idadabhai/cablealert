import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cablealert.io';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'CableAlert — Subsea Cable Outage Alerts for Latency-Sensitive Traders',
    template: '%s | CableAlert',
  },
  description:
    'Get Telegram and email alerts 15 minutes before Twitter when subsea cables are cut or degraded. Built by a former Colt Technology wholesale director for HFT desks, prop trading infrastructure, and CDN operators.',
  keywords: [
    'subsea cable outage alerts',
    'submarine cable monitoring',
    'cable cut notification',
    'HFT network monitoring',
    'trading route latency',
    'subsea cable intelligence',
    'MAREA cable alert',
    'SEA-ME-WE cable outage',
    'real-time network monitoring traders',
  ],
  openGraph: {
    title: 'CableAlert — Subsea Cable Outage Alerts for Latency-Sensitive Traders',
    description:
      'Subsea cable outage alerts for HFT desks and trading infrastructure. Get notified 15 minutes before Twitter. Built by a former Colt Technology wholesale director.',
    url: BASE_URL,
    siteName: 'CableAlert',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CableAlert — Subsea Cable Outage Alerts',
    description: 'Real-time subsea cable outage intelligence. 15 minutes ahead of Twitter. Built by a former Colt Technology wholesale director.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-gray-950 text-gray-100`}>
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-white">
              <span className="text-red-500">⬤</span>
              <span>CableAlert</span>
              <span className="text-xs font-normal text-gray-500 hidden sm:inline">
                subsea cable intelligence
              </span>
            </a>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/" className="text-gray-400 hover:text-white transition-colors">Live feed</a>
              <a href="/subscribe" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-semibold transition-colors text-sm">
                Subscribe — £50/mo
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-gray-800 mt-20 px-6 py-8 text-center text-gray-500 text-xs">
          <p>CableAlert · Real-time subsea cable intelligence for latency-sensitive traders</p>
          <p className="mt-1">Built by a former Colt Technology wholesale director · 11 years of subsea network operations experience</p>
          <p className="mt-2">
            <a href="mailto:contact@cablealert.io" className="hover:text-gray-300">contact@cablealert.io</a>
            {' · '}
            <a href="/subscribe" className="hover:text-gray-300">Pricing</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
