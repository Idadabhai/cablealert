// lib/db.ts — Supabase client singleton
// Server-side operations use service role key (bypasses RLS)
// Client-side operations use anon key (RLS enforced)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Subscriber,
  SubscriberInsert,
  OutageEvent,
  OutageEventInsert,
  AlertDelivery,
  AlertDeliveryInsert,
  ScrapeLog,
  ScrapeLogInsert,
  AdminAlert,
  AdminAlertInsert,
  Severity,
} from '@/types/db';

// ── Clients ────────────────────────────────────────────────

let serverClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (serverClient) return serverClient;
  serverClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  return serverClient;
}

// ── Subscribers ────────────────────────────────────────────

export async function getActiveSubscribers(): Promise<Subscriber[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from('subscribers')
    .select('*')
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) throw new Error(`getActiveSubscribers: ${error.message}`);
  return data ?? [];
}

export async function getSubscriberByStripeCustomer(
  stripeCustomerId: string
): Promise<Subscriber | null> {
  const db = getServerClient();
  const { data, error } = await db
    .from('subscribers')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function upsertSubscriber(
  subscriber: Partial<SubscriberInsert> & { email: string }
): Promise<Subscriber> {
  const db = getServerClient();
  const { data, error } = await db
    .from('subscribers')
    .upsert(
      { ...subscriber, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
    .select()
    .single();
  if (error) throw new Error(`upsertSubscriber: ${error.message}`);
  return data;
}

export async function updateSubscriberTelegramId(
  subscriberId: string,
  chatId: string
): Promise<void> {
  const db = getServerClient();
  const { error } = await db
    .from('subscribers')
    .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
    .eq('id', subscriberId);
  if (error) throw new Error(`updateSubscriberTelegramId: ${error.message}`);
}

export async function cancelSubscriber(email: string): Promise<void> {
  const db = getServerClient();
  const { error } = await db
    .from('subscribers')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', email);
  if (error) throw new Error(`cancelSubscriber: ${error.message}`);
}

// ── Outage Events ──────────────────────────────────────────

export async function insertOutageEvent(event: OutageEventInsert): Promise<OutageEvent> {
  const db = getServerClient();
  const { data, error } = await db
    .from('outage_events')
    .insert(event)
    .select()
    .single();
  if (error) throw new Error(`insertOutageEvent: ${error.message}`);
  return data;
}

export async function getOutageEventBySourceUrl(url: string): Promise<OutageEvent | null> {
  const db = getServerClient();
  const { data, error } = await db
    .from('outage_events')
    .select('*')
    .eq('source_url', url)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function getRecentOutageEvents(
  limit = 20,
  minSeverity: Severity = 'low'
): Promise<OutageEvent[]> {
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'resolved'];
  const minIndex = severityOrder.indexOf(minSeverity);
  const allowedSeverities = severityOrder.slice(0, minIndex + 1);

  const db = getServerClient();
  const { data, error } = await db
    .from('outage_events')
    .select('*')
    .in('severity', allowedSeverities)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentOutageEvents: ${error.message}`);
  return data ?? [];
}

export async function getOutageEventsSince(since: Date): Promise<OutageEvent[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from('outage_events')
    .select('*')
    .neq('severity', 'noise')
    .gte('created_at', since.toISOString())
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getOutageEventsSince: ${error.message}`);
  return data ?? [];
}

export async function markEventAlertSent(eventId: string, xPostUrl?: string): Promise<void> {
  const db = getServerClient();
  const { error } = await db
    .from('outage_events')
    .update({
      alert_sent: true,
      x_post_url: xPostUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);
  if (error) throw new Error(`markEventAlertSent: ${error.message}`);
}

// ── Alert Deliveries ────────────────────────────────────────

export async function insertAlertDelivery(delivery: AlertDeliveryInsert): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from('alert_deliveries').insert(delivery);
  if (error) throw new Error(`insertAlertDelivery: ${error.message}`);
}

export async function getRecentAlertDeliveries(
  subscriberId: string,
  limit = 10
): Promise<AlertDelivery[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from('alert_deliveries')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentAlertDeliveries: ${error.message}`);
  return data ?? [];
}

// ── Scrape Logs ─────────────────────────────────────────────

export async function insertScrapeLog(log: ScrapeLogInsert): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from('scrape_logs').insert(log);
  if (error) console.error('insertScrapeLog (non-fatal):', error.message);
}

export async function getRecentScrapeLogs(limit = 20): Promise<ScrapeLog[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from('scrape_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentScrapeLogs: ${error.message}`);
  return data ?? [];
}

// ── Admin Alerts ────────────────────────────────────────────

export async function insertAdminAlert(alert: AdminAlertInsert): Promise<AdminAlert> {
  const db = getServerClient();
  const { data, error } = await db
    .from('admin_alerts')
    .insert(alert)
    .select()
    .single();
  if (error) throw new Error(`insertAdminAlert: ${error.message}`);
  return data;
}

export async function updateAdminAlertSubscribersReached(
  id: string,
  count: number
): Promise<void> {
  const db = getServerClient();
  const { error } = await db
    .from('admin_alerts')
    .update({ subscribers_reached: count })
    .eq('id', id);
  if (error) console.error('updateAdminAlertSubscribersReached (non-fatal):', error.message);
}

// ── Stats ────────────────────────────────────────────────────

export async function getAdminStats(): Promise<{
  activeSubscribers: number;
  alertsSent24h: number;
  failedDeliveries24h: number;
  scrapeSuccessRate: number;
}> {
  const db = getServerClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [subscribers, alertsSent, alertsFailed, scrapeLogs] = await Promise.all([
    db.from('subscribers').select('id', { count: 'exact' }).eq('status', 'active').is('deleted_at', null),
    db.from('alert_deliveries').select('id', { count: 'exact' }).gte('created_at', since24h).eq('status', 'sent'),
    db.from('alert_deliveries').select('id', { count: 'exact' }).gte('created_at', since24h).eq('status', 'failed'),
    db.from('scrape_logs').select('status').gte('created_at', since24h),
  ]);

  const scrapes = scrapeLogs.data ?? [];
  const successRate = scrapes.length === 0
    ? 100
    : Math.round((scrapes.filter(s => s.status === 'success').length / scrapes.length) * 100);

  return {
    activeSubscribers: subscribers.count ?? 0,
    alertsSent24h: alertsSent.count ?? 0,
    failedDeliveries24h: alertsFailed.count ?? 0,
    scrapeSuccessRate: successRate,
  };
}
