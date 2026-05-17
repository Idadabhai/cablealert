import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | CableAlert',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-sky-400 font-mono text-sm font-semibold mb-3">404</p>
        <h1 className="text-3xl font-bold text-white mb-4">Page not found</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          This page doesn&apos;t exist. The subsea cable monitor is running fine — just this URL that&apos;s down.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-colors"
          >
            View live outage feed
          </Link>
          <Link
            href="/subscribe"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold text-sm transition-colors"
          >
            Subscribe for alerts
          </Link>
        </div>
      </div>
    </div>
  );
}
