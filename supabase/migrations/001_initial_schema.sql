-- CableAlert — Initial Schema
-- Run in Supabase SQL Editor (or via Supabase CLI: supabase db push)

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Subscribers ──────────────────────────────────────────────
CREATE TABLE public.subscribers (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email                   TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  telegram_chat_id        TEXT UNIQUE,
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'past_due', 'cancelled', 'trialling')),
  routes_filter           TEXT[] DEFAULT NULL,
  min_severity            TEXT NOT NULL DEFAULT 'high'
                          CHECK (min_severity IN ('critical', 'high', 'medium', 'low', 'resolved', 'noise')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (API routes use service role key)
CREATE POLICY "service_role_bypass" ON public.subscribers
  USING (auth.role() = 'service_role');

-- ── Outage Events ────────────────────────────────────────────
CREATE TABLE public.outage_events (
  id                          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cable_name                  TEXT,
  affected_routes             TEXT[] NOT NULL DEFAULT '{}',
  severity                    TEXT NOT NULL DEFAULT 'noise'
                              CHECK (severity IN ('critical', 'high', 'medium', 'low', 'resolved', 'noise')),
  summary                     TEXT NOT NULL,
  raw_text                    TEXT,
  source_url                  TEXT UNIQUE NOT NULL,
  source_name                 TEXT NOT NULL,
  estimated_latency_impact_ms INT,
  confidence                  NUMERIC(3, 2) NOT NULL DEFAULT 0,
  x_post_url                  TEXT,
  alert_sent                  BOOLEAN NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ,
  deleted_at                  TIMESTAMPTZ
);

ALTER TABLE public.outage_events ENABLE ROW LEVEL SECURITY;

-- Public read access to non-deleted, non-noise events (for landing page feed)
CREATE POLICY "public_read_outages" ON public.outage_events
  FOR SELECT USING (deleted_at IS NULL AND severity != 'noise');

CREATE POLICY "service_role_bypass" ON public.outage_events
  USING (auth.role() = 'service_role');

CREATE INDEX idx_outage_events_source_url ON public.outage_events(source_url);
CREATE INDEX idx_outage_events_severity ON public.outage_events(severity);
CREATE INDEX idx_outage_events_created_at ON public.outage_events(created_at DESC);

-- ── Alert Deliveries ─────────────────────────────────────────
CREATE TABLE public.alert_deliveries (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id         UUID NOT NULL REFERENCES public.subscribers(id),
  event_id              UUID REFERENCES public.outage_events(id),
  admin_alert_id        UUID,
  channel               TEXT NOT NULL CHECK (channel IN ('telegram', 'email')),
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('sent', 'failed', 'pending')),
  telegram_message_id   TEXT,
  error_message         TEXT,
  is_digest             BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_bypass" ON public.alert_deliveries
  USING (auth.role() = 'service_role');

CREATE INDEX idx_alert_deliveries_subscriber ON public.alert_deliveries(subscriber_id);
CREATE INDEX idx_alert_deliveries_created ON public.alert_deliveries(created_at DESC);

-- ── Scrape Logs ──────────────────────────────────────────────
CREATE TABLE public.scrape_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_name     TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  items_found     INT NOT NULL DEFAULT 0,
  items_new       INT NOT NULL DEFAULT 0,
  duration_ms     INT NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_bypass" ON public.scrape_logs
  USING (auth.role() = 'service_role');

CREATE INDEX idx_scrape_logs_created ON public.scrape_logs(created_at DESC);

-- ── Admin Alerts ─────────────────────────────────────────────
CREATE TABLE public.admin_alerts (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cable_name            TEXT NOT NULL,
  affected_routes       TEXT[] NOT NULL DEFAULT '{}',
  severity              TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'resolved', 'noise')),
  message               TEXT NOT NULL,
  subscribers_reached   INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_bypass" ON public.admin_alerts
  USING (auth.role() = 'service_role');
