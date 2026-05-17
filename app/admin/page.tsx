// app/admin/page.tsx — Admin dashboard
// Gated by ADMIN_SECRET query param for now (replace with proper auth in Session 7)

import { getAdminStats, getRecentScrapeLogs, getRecentOutageEvents } from '@/lib/db';
import { calculateMRR } from '@/lib/payments';

export const metadata = { title: 'Admin — CableAlert' };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  if (searchParams.key !== process.env.ADMIN_SECRET) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Authorisation required.</p>
      </div>
    );
  }

  const [stats, scrapeLogs, recentEvents, mrr] = await Promise.allSettled([
    getAdminStats(),
    getRecentScrapeLogs(20),
    getRecentOutageEvents(20),
    calculateMRR(),
  ]);

  const statsData = stats.status === 'fulfilled' ? stats.value : null;
  const scrapeLogsData = scrapeLogs.status === 'fulfilled' ? scrapeLogs.value : [];
  const eventsData = recentEvents.status === 'fulfilled' ? recentEvents.value : [];
  const mrrData = mrr.status === 'fulfilled' ? mrr.value : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Admin</h1>
        <p className="text-gray-500 text-sm">CableAlert internal dashboard</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'MRR', value: mrrData != null ? `£${mrrData.toFixed(0)}` : '—' },
          { label: 'Active subs', value: statsData?.activeSubscribers ?? '—' },
          { label: 'Alerts (24h)', value: statsData?.alertsSent24h ?? '—' },
          { label: 'Scrape success', value: statsData ? `${statsData.scrapeSuccessRate}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="border border-gray-800 bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Recent outage events */}
      <div className="mb-8">
        <h2 className="font-semibold text-white mb-4">Recent outage events (last 20)</h2>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                {['Severity', 'Cable', 'Routes', 'Source', 'Alert sent', 'When'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventsData.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-600">No events yet</td></tr>
              ) : eventsData.map(e => (
                <tr key={e.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold uppercase ${
                      e.severity === 'critical' ? 'text-red-400'
                      : e.severity === 'high' ? 'text-orange-400'
                      : e.severity === 'resolved' ? 'text-green-400'
                      : 'text-gray-400'
                    }`}>{e.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{e.cable_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.affected_routes.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.source_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={e.alert_sent ? 'text-green-400' : 'text-gray-600'}>
                      {e.alert_sent ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(e.created_at).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scrape logs */}
      <div>
        <h2 className="font-semibold text-white mb-4">Scrape log (last 20 runs)</h2>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                {['Source', 'Status', 'Found', 'Duration', 'When'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scrapeLogsData.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-600">No scrape runs yet</td></tr>
              ) : scrapeLogsData.map(log => (
                <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-gray-300 text-xs">{log.source_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`font-medium ${log.status === 'success' ? 'text-green-400' : log.status === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.items_found}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.duration_ms}ms</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(log.created_at).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
