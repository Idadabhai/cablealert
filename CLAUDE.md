# CLAUDE.md — CableAlert Session Bootstrap

Read this file first, every session. It is the working memory for this codebase.
The CHANGELOG.md is the audit trail.

---

## Product in one paragraph

CableAlert (target: cablealert.io) is a real-time subsea cable intelligence service for
latency-sensitive trading desks, HFT infrastructure teams, and CDN operators. A scraper
pipeline polls NOC feeds, SubTel Forum, ThousandEyes, and Twitter every 15 minutes.
Claude classifies each event by severity and affected route. Subscribers receive Telegram
push alerts and daily email digests — typically 15 minutes ahead of Twitter. Revenue via
Stripe subscription at £50/month. Stack: Next.js 16.2.6 App Router, Supabase, Claude
claude-sonnet-4-20250514, Stripe, Resend, Telegram Bot API.

---

## The Founder's Unfair Advantage

11 years at Colt Technology as a Strategic Alliances Director in the Optical and Wholesale
division. Direct knowledge of:
- Which subsea cable systems carry which financial routes (MAREA, Hibernia, SEA-ME-WE 5)
- How NOC alerts propagate from carrier networks to public sources (10–20 min lag to Twitter)
- Why the London–Singapore corridor is structurally elevated risk (Red Sea / Houthi)
- Which cable repair vessels are operated by HMN Tech vs Alcatel, and how rerouting affects timelines
- How trading desks interpret latency changes and what thresholds trigger risk management actions

This is not a news scraper. It is expert-framed intelligence. That framing is the product.

---

## Business Model

- Price: £50/month per subscriber
- Delivery: Telegram push alerts (critical/high) + daily email digest (7am UTC)
- Target: latency-sensitive traders, HFT infrastructure teams, CDN operators, network engineers
  at banks and hedge funds
- GTM: LinkedIn + X organic (founder expertise angle), niche trading community outreach
- MRR target: £1,000 (20 subscribers) to justify continued build

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.6 App Router, TypeScript strict |
| Database | Supabase (Postgres + RLS + Auth) |
| AI | Claude claude-sonnet-4-20250514 via `lib/ai.ts` |
| Alerts | Telegram Bot API via `lib/telegram.ts` |
| Email | Resend via `lib/email.ts` — daily digest + critical alerts |
| Payments | Stripe via `lib/payments.ts` — £50/month subscription |
| Scraping | Cheerio (SubTel Forum, ThousandEyes) + Twitter API v2 |
| Styling | Tailwind CSS, dark theme (bg-gray-950) |

---

## Architecture

### Cron pipeline (runs every 15 minutes via Vercel Cron)
```
app/api/cron/scrape/route.ts
  → lib/scrapers/subtelforum.ts   (Cheerio scraper)
  → lib/scrapers/twitter.ts       (Twitter API v2)
  → lib/scrapers/thousandeyes.ts  (Cheerio scraper)
  → lib/ai.ts                     (Claude classifies: severity, routes, latency impact)
  → lib/db.ts                     (Upsert to outage_events)
  → lib/telegram.ts               (Broadcast critical/high to all subscribers)

app/api/cron/digest/route.ts      (7am UTC daily)
  → lib/db.ts                     (Fetch last 24h events)
  → lib/ai.ts                     (Summarise events)
  → lib/email.ts                  (Resend digest to all subscribers)
```

### Data types (see types/db.ts)
```
Severity: 'critical' | 'high' | 'medium' | 'low' | 'resolved' | 'noise'
OutageEvent: id, cable_name, affected_routes[], summary, severity, source_name, 
             source_url, estimated_latency_impact_ms, created_at
```

### Key pages
```
app/page.tsx           — Landing page + live outage feed (server-rendered, DB fetch)
app/subscribe/page.tsx — Pricing + Stripe checkout form
app/dashboard/page.tsx — Subscriber-only: outage history, alert settings
app/admin/page.tsx     — Admin: manual event injection, subscriber list
```

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `subscribers` | Stripe customer_id, telegram_chat_id, email, active/cancelled status |
| `outage_events` | All classified events. Severity + routes + latency impact |
| `alert_deliveries` | Audit log: which events were sent to which subscribers |
| `scrape_logs` | Run log for each cron execution (success/fail, events_found) |
| `admin_alerts` | Manual admin-injected events for testing |

RLS: service_role bypass policy on all tables. Client reads restricted to authenticated subscribers.

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://cablealert.io

# AI
ANTHROPIC_API_KEY=

# Email
RESEND_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_ID=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Twitter/X
TWITTER_BEARER_TOKEN=

# Cron auth
CRON_SECRET=
```

---

## Vercel Cron Configuration (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/scrape", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/digest", "schedule": "0 7 * * *" }
  ]
}
```

Both crons require `Authorization: Bearer ${CRON_SECRET}` header. Vercel passes this automatically.

---

## Known issues / next session work

| Issue | Status |
|---|---|
| No GitHub remote configured | Needs user to create repo at github.com → `git remote add origin` |
| Admin page has no auth gate | Add `ADMIN_SECRET` env check before rendering admin content |
| Scraper error handling | `lib/scrapers/twitter.ts` needs rate-limit retry logic |
| Dashboard subscriber auth | Currently stub — needs Stripe customer ID lookup on session |

---

## SEO/AEO/GEO status (as of Session 2, 17 May 2026)

- ✅ `metadataBase` — `https://cablealert.io`
- ✅ `title.template` — `%s | CableAlert`
- ✅ `keywords` — 9 targeted terms including "subsea cable outage alerts", "HFT network monitoring"
- ✅ FAQPage JSON-LD — 6 questions (what is outage, repair time, which routes, how detected, delivery, who for)
- ✅ SoftwareApplication JSON-LD — FinanceApplication category, GBP pricing, creator credential
- ✅ Visible FAQ section — `id="faq"`, 6 items, crawlable HTML
- ✅ GEO stats section — 3 cards: 95% traffic (TeleGeography 2024), 2-4wk repair (ICPC 2023), 15min lead
- ✅ Red Sea expert callout — Houthi risk framing with HMN Tech / Alcatel specifics
- ✅ `app/robots.ts` — disallows /admin /dashboard /api
- ✅ `app/sitemap.ts` — homepage (daily), /subscribe (monthly)

---

## Session queue

### Next session priorities

1. **Deploy to Vercel** — User to create GitHub repo + push. Then connect to Vercel. Set all env vars.
2. **Stripe product setup** — Create £50/month price in Stripe dashboard. Set `NEXT_PUBLIC_STRIPE_PRICE_ID`.
3. **Telegram bot** — Create bot via @BotFather. Set `TELEGRAM_BOT_TOKEN`. Set webhook URL.
4. **Twitter API** — Apply for v2 Basic tier (~$100/month). Set `TWITTER_BEARER_TOKEN`.
5. **Dashboard auth** — Gate `/dashboard` behind Stripe customer lookup.
6. **First LinkedIn post** — Expert framing: "Why subsea cable cuts move markets before anyone knows"

### ✅ Completed in Session 1 (16 May 2026)

- Full Next.js 16.2.6 App Router scaffold
- Supabase schema (5 tables, RLS, migrations)
- All service libraries (db, ai, telegram, email, payments)
- All scrapers (SubTel Forum, ThousandEyes, Twitter API)
- Cron handlers (15-min scrape, 7am digest)
- Webhook handlers (Stripe, Telegram commands)
- Landing page: live outage feed + hero + how it works + monitored routes + pricing CTA
- Subscribe page, dashboard stub, admin page
- Next.js 16 upgrade + TypeScript type fixes

### ✅ Completed in Session 2 (17 May 2026)

- SEO/AEO/GEO full layer: metadataBase, title template, keywords, OG/Twitter
- FAQPage JSON-LD (6 questions), SoftwareApplication JSON-LD
- Visible FAQ section (id="faq", 6 items, crawlable)
- GEO stats section (TeleGeography, ICPC citations)
- Red Sea expert callout (Houthi, HMN Tech, Alcatel specifics)
- `app/robots.ts` — NEW
- `app/sitemap.ts` — NEW
- `.gitignore` — NEW
- Full source tracking committed (all 31 files)
- Commit: `5fba4c5`
