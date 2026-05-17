// CableAlert — Supabase database types
// Run: npx supabase gen types typescript --linked > types/db.ts to regenerate

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'resolved' | 'noise';
export type AlertChannel = 'telegram' | 'email';
export type SubscriberStatus = 'active' | 'past_due' | 'cancelled' | 'trialling';
export type AlertDeliveryStatus = 'sent' | 'failed' | 'pending';

// ── Subscribers ────────────────────────────────────────

export interface Subscriber {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  telegram_chat_id: string | null;
  status: SubscriberStatus;
  routes_filter: string[] | null; // null = all routes
  min_severity: Severity;         // minimum severity to alert on
  created_at: string;
  updated_at: string | null;
  cancelled_at: string | null;
  deleted_at: string | null;
}

export type SubscriberInsert = Omit<Subscriber, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// ── Outage Events ──────────────────────────────────────

export interface OutageEvent {
  id: string;
  cable_name: string | null;
  affected_routes: string[];        // e.g. ['London-New York', 'London-Singapore']
  severity: Severity;
  summary: string;                  // Claude-generated plain English summary
  raw_text: string | null;          // trimmed to 1000 chars — never full HTML
  source_url: string;               // used as deduplication key
  source_name: string;              // e.g. 'SubtelForum', 'Twitter', 'ThousandEyes'
  estimated_latency_impact_ms: number | null;
  confidence: number;               // 0-1 Claude confidence score
  x_post_url: string | null;        // set after auto-post to X
  alert_sent: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export type OutageEventInsert = Omit<OutageEvent, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// ── Alert Deliveries ────────────────────────────────────

export interface AlertDelivery {
  id: string;
  subscriber_id: string;
  event_id: string | null;          // null for digest/manual alerts
  admin_alert_id: string | null;
  channel: AlertChannel;
  status: AlertDeliveryStatus;
  telegram_message_id: string | null;
  error_message: string | null;
  is_digest: boolean;
  created_at: string;
}

export type AlertDeliveryInsert = Omit<AlertDelivery, 'id' | 'created_at'>;

// ── Scrape Logs ─────────────────────────────────────────

export interface ScrapeLog {
  id: string;
  source_name: string;
  status: 'success' | 'error' | 'partial';
  items_found: number;
  items_new: number;
  duration_ms: number;
  error_message: string | null;
  created_at: string;
}

export type ScrapeLogInsert = Omit<ScrapeLog, 'id' | 'created_at'>;

// ── Admin Alerts ────────────────────────────────────────

export interface AdminAlert {
  id: string;
  cable_name: string;
  affected_routes: string[];
  severity: Severity;
  message: string;
  subscribers_reached: number;
  created_at: string;
}

export type AdminAlertInsert = Omit<AdminAlert, 'id' | 'created_at' | 'subscribers_reached'>;

// ── Claude classification output ────────────────────────

export interface OutageClassification {
  severity: Severity;
  cable_name: string | null;
  affected_routes: string[];
  summary: string;
  estimated_latency_impact_ms: number | null;
  confidence: number; // 0-1
  is_outage: boolean;
}

// ── Scraper raw output ──────────────────────────────────

export interface ScrapedItem {
  headline: string;
  url: string;
  date: string | null;
  bodyText: string;
  source: string;
}
