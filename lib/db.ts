// lib/db.ts — All database operations for CableAlert
// DB: Neon serverless Postgres (@neondatabase/serverless)
// Env: DATABASE_URL (connection string from Neon dashboard)
// Server-side only — never import from client components.

import { neon } from '@neondatabase/serverless';
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

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return neon(process.env.DATABASE_URL);
}

// ── Subscribers ────────────────────────────────────────────────────────────

export async function getActiveSubscribers(): Promise<Subscriber[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM subscribers WHERE status = 'active' AND deleted_at IS NULL
  `;
  return rows as Subscriber[];
}

export async function getSubscriberByStripeCustomer(
  stripeCustomerId: string
): Promise<Subscriber | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM subscribers WHERE stripe_customer_id = ${stripeCustomerId} LIMIT 1
  `;
  return (rows[0] as Subscriber) ?? null;
}

export async function getSubscriberById(id: string): Promise<Subscriber | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM subscribers WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Subscriber) ?? null;
}

export async function upsertSubscriber(
  subscriber: Partial<SubscriberInsert> & { email: string }
): Promise<Subscriber> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO subscribers (
      email, stripe_customer_id, stripe_subscription_id,
      status, telegram_chat_id, min_severity, routes_filter
    ) VALUES (
      ${subscriber.email},
      ${subscriber.stripe_customer_id ?? null},
      ${subscriber.stripe_subscription_id ?? null},
      ${subscriber.status ?? 'active'},
      ${subscriber.telegram_chat_id ?? null},
      ${subscriber.min_severity ?? 'high'},
      ${subscriber.routes_filter ? JSON.stringify(subscriber.routes_filter) : null}
    )
    ON CONFLICT (email) DO UPDATE SET
      stripe_customer_id    = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      status                = EXCLUDED.status,
      updated_at            = NOW()
    RETURNING *
  `;
  return rows[0] as Subscriber;
}

export async function updateSubscriberTelegramId(
  subscriberId: string,
  chatId: string
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE subscribers SET telegram_chat_id = ${chatId}, updated_at = NOW() WHERE id = ${subscriberId}
  `;
}

export async function cancelSubscriber(email: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE subscribers
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE email = ${email}
  `;
}

// ── Outage Events ──────────────────────────────────────────────────────────

export async function insertOutageEvent(event: OutageEventInsert): Promise<OutageEvent> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO outage_events (
      cable_name, affected_routes, summary, severity,
      source_name, source_url, estimated_latency_impact_ms
    ) VALUES (
      ${event.cable_name ?? null},
      ${event.affected_routes ? JSON.stringify(event.affected_routes) : '[]'},
      ${event.summary},
      ${event.severity},
      ${event.source_name},
      ${event.source_url ?? null},
      ${event.estimated_latency_impact_ms ?? null}
    )
    RETURNING *
  `;
  return rows[0] as OutageEvent;
}

export async function getOutageEventBySourceUrl(url: string): Promise<OutageEvent | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM outage_events WHERE source_url = ${url} LIMIT 1
  `;
  return (rows[0] as OutageEvent) ?? null;
}

export async function getRecentOutageEvents(
  limit = 20,
  minSeverity: Severity = 'low'
): Promise<OutageEvent[]> {
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'resolved'];
  const minIndex = severityOrder.indexOf(minSeverity);
  const allowedSeverities = severityOrder.slice(0, minIndex + 1);
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM outage_events
    WHERE severity = ANY(${allowedSeverities})
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as OutageEvent[];
}

export async function getOutageEventsSince(since: Date): Promise<OutageEvent[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM outage_events
    WHERE severity != 'noise'
      AND created_at >= ${since.toISOString()}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  return rows as OutageEvent[];
}

export async function markEventAlertSent(eventId: string, xPostUrl?: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE outage_events
    SET alert_sent = true, x_post_url = ${xPostUrl ?? null}, updated_at = NOW()
    WHERE id = ${eventId}
  `;
}

// ── Alert Deliveries ───────────────────────────────────────────────────────

export async function insertAlertDelivery(delivery: AlertDeliveryInsert): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO alert_deliveries (event_id, subscriber_id, channel, status, error_message)
    VALUES (
      ${delivery.event_id},
      ${delivery.subscriber_id},
      ${delivery.channel},
      ${delivery.status ?? 'sent'},
      ${delivery.error_message ?? null}
    )
  `;
}

export async function getRecentAlertDeliveries(
  subscriberId: string,
  limit = 10
): Promise<AlertDelivery[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM alert_deliveries
    WHERE subscriber_id = ${subscriberId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as AlertDelivery[];
}

// ── Scrape Logs ────────────────────────────────────────────────────────────

export async function insertScrapeLog(log: ScrapeLogInsert): Promise<void> {
  const sql = getDb();
  try {
    await sql`
      INSERT INTO scrape_logs (source_name, status, items_found, items_new, duration_ms, error_message)
      VALUES (
        ${log.source_name},
        ${log.status},
        ${log.items_found ?? 0},
        ${log.items_new ?? 0},
        ${log.duration_ms ?? null},
        ${log.error_message ?? null}
      )
    `;
  } catch (err) {
    console.error('insertScrapeLog (non-fatal):', err);
  }
}

export async function getRecentScrapeLogs(limit = 20): Promise<ScrapeLog[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM scrape_logs ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows as ScrapeLog[];
}

// ── Admin Alerts ───────────────────────────────────────────────────────────

export async function insertAdminAlert(alert: AdminAlertInsert): Promise<AdminAlert> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO admin_alerts (cable_name, affected_routes, severity, message)
    VALUES (
      ${alert.cable_name ?? null},
      ${alert.affected_routes ? JSON.stringify(alert.affected_routes) : '[]'},
      ${alert.severity},
      ${alert.message}
    )
    RETURNING *
  `;
  return rows[0] as AdminAlert;
}

export async function updateAdminAlertSubscribersReached(
  id: string,
  count: number
): Promise<void> {
  const sql = getDb();
  try {
    await sql`UPDATE admin_alerts SET subscribers_reached = ${count} WHERE id = ${id}`;
  } catch (err) {
    console.error('updateAdminAlertSubscribersReached (non-fatal):', err);
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<{
  activeSubscribers: number;
  alertsSent24h: number;
  failedDeliveries24h: number;
  scrapeSuccessRate: number;
}> {
  const sql = getDb();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [subRows, sentRows, failedRows, scrapeRows] = await Promise.all([
    sql`SELECT COUNT(*) AS c FROM subscribers WHERE status = 'active' AND deleted_at IS NULL`,
    sql`SELECT COUNT(*) AS c FROM alert_deliveries WHERE created_at >= ${since24h} AND status = 'sent'`,
    sql`SELECT COUNT(*) AS c FROM alert_deliveries WHERE created_at >= ${since24h} AND status = 'failed'`,
    sql`SELECT status FROM scrape_logs WHERE created_at >= ${since24h}`,
  ]);

  const scrapes = scrapeRows as { status: string }[];
  const successRate =
    scrapes.length === 0
      ? 100
      : Math.round(
          (scrapes.filter((s) => s.status === 'success').length / scrapes.length) * 100
        );

  return {
    activeSubscribers: Number((subRows[0] as { c: string }).c),
    alertsSent24h: Number((sentRows[0] as { c: string }).c),
    failedDeliveries24h: Number((failedRows[0] as { c: string }).c),
    scrapeSuccessRate: successRate,
  };
}
