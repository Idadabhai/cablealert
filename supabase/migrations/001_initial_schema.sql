-- CableAlert — Neon Postgres schema
-- Run via Neon SQL editor: paste entire file and execute.
-- No RLS — all queries are server-side only (lib/db.ts).

-- ── Extensions ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Subscribers ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscribers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   TEXT NOT NULL,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  telegram_chat_id        TEXT,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','past_due','cancelled','trialling')),
  routes_filter           JSONB,              -- null = all routes; array of route strings
  min_severity            TEXT NOT NULL DEFAULT 'high'
                            CHECK (min_severity IN ('critical','high','medium','low','resolved','noise')),
  cancelled_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ,
  CONSTRAINT subscribers_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status     ON subscribers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_cid ON subscribers (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ── Outage Events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outage_events (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cable_name                   TEXT,
  affected_routes              JSONB NOT NULL DEFAULT '[]',
  severity                     TEXT NOT NULL DEFAULT 'noise'
                                 CHECK (severity IN ('critical','high','medium','low','resolved','noise')),
  summary                      TEXT NOT NULL,
  raw_text                     TEXT,
  source_url                   TEXT,
  source_name                  TEXT NOT NULL,
  estimated_latency_impact_ms  INT,
  confidence                   NUMERIC(3,2) NOT NULL DEFAULT 0,
  x_post_url                   TEXT,
  alert_sent                   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ,
  deleted_at                   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outage_events_source_url ON outage_events (source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outage_events_severity   ON outage_events (severity);
CREATE INDEX IF NOT EXISTS idx_outage_events_created_at ON outage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outage_events_deleted_at ON outage_events (deleted_at) WHERE deleted_at IS NULL;

-- ── Alert Deliveries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id        UUID NOT NULL REFERENCES subscribers (id) ON DELETE CASCADE,
  event_id             UUID REFERENCES outage_events (id) ON DELETE SET NULL,
  admin_alert_id       UUID,
  channel              TEXT NOT NULL CHECK (channel IN ('telegram','email')),
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('sent','failed','pending')),
  telegram_message_id  TEXT,
  error_message        TEXT,
  is_digest            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_subscriber ON alert_deliveries (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_event      ON alert_deliveries (event_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_created_at ON alert_deliveries (created_at DESC);

-- ── Scrape Logs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scrape_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name    TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('success','error','partial')),
  items_found    INT NOT NULL DEFAULT 0,
  items_new      INT NOT NULL DEFAULT 0,
  duration_ms    INT,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_created_at ON scrape_logs (created_at DESC);

-- ── Admin Alerts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cable_name          TEXT,
  affected_routes     JSONB NOT NULL DEFAULT '[]',
  severity            TEXT NOT NULL
                        CHECK (severity IN ('critical','high','medium','low','resolved','noise')),
  message             TEXT NOT NULL,
  subscribers_reached INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from alert_deliveries to admin_alerts now that admin_alerts exists
ALTER TABLE alert_deliveries
  ADD CONSTRAINT fk_alert_deliveries_admin_alert
  FOREIGN KEY (admin_alert_id) REFERENCES admin_alerts (id) ON DELETE SET NULL;

-- ── Updated-at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_outage_events_updated_at
  BEFORE UPDATE ON outage_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
