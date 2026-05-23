# CLAUDE.md — CableAlert Session Bootstrap

Read this file first, every session. It is the working memory for this codebase.
The CHANGELOG.md is the audit trail.

@C:\Windows\Personal\Business\CLAUDE_PAYMENTS.md
@C:\Windows\Personal\Business\CLAUDE_DISTRIBUTION.md

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

## Subsea Cable Intelligence (inform scraper targets, AI prompts, and alert copy)

### Priority NOC Sources to scrape (public feeds)

| Source | URL | Type |
|---|---|---|
| TeleGeography Cable Map | telegeography.com/resources/submarine-cable-map | Definitive cable database |
| Kentik Internet Outage | kentik.com/resources/internet-outages | Real-time BGP/routing |
| ThousandEyes Internet Outage | thousandeyes.com/outages | Route measurement data |
| RIPE NCC routing data | stat.ripe.net | BGP anomaly detection |
| SubTel Forum news | subtelforum.com/news | Industry news + repair reports |
| Twitter/X | search: "subsea cable cut OR outage OR fault" | Real-time social signal |

Founder context: NOC alerts propagate from carrier networks to public sources with a 10–20 minute
lag to Twitter. CableAlert's scrape-and-classify loop runs every 15 minutes — this is the competitive
moat. Financial subscribers act on this 15-minute window.

### High-Priority Cable Systems (by trading route sensitivity)

**London → New York** (Atlantic)
- Systems: TAT-14, MAREA, AEConnect-1, Hibernia Express
- Latency benchmark: ~65ms | Alert threshold: >80ms
- Subscriber segment: Crypto traders + FX/equity desks

**London → Singapore (via Red Sea)** — ELEVATED RISK ROUTE
- Systems: FLAG/FALCON, SEA-ME-WE-3, SEA-ME-WE-4, SEA-ME-WE-5, EIG
- Latency benchmark: ~160ms | Alert threshold: >200ms
- **RED SEA RISK:** Houthi activity since 2024 makes this corridor structurally volatile.
  Rerouting via Cape of Good Hope adds ~80ms. Include this context in every alert on this route.
- Subscriber segment: FX/equity desks (highest sensitivity), CDN operators

**London → Tokyo** (Pacific)
- Systems: FASTER, JUPITER, PC-1
- Latency benchmark: ~230ms | Alert threshold: >280ms
- Subscriber segment: FX/equity + crypto (Pacific exchange arbitrage)

**New York → São Paulo** (Atlantic South)
- Systems: MONET, SAm-1, Americas-II
- Latency benchmark: ~120ms | Alert threshold: >150ms
- Subscriber segment: Crypto traders + EM FX desks

### Alert Classification (use in Claude AI prompt for severity scoring)

| Severity | Trigger | Subscriber action |
|---|---|---|
| CRITICAL | Cable cut confirmed, no ETA for repair (weeks/months) | Immediate Telegram push to all subscribers |
| HIGH | Partial capacity loss, rerouting in progress | Immediate Telegram push to all subscribers |
| MEDIUM | Planned maintenance, known downtime window | Include in 7am UTC daily digest |
| LOW | Minor degradation, within normal variance | Include in 7am UTC daily digest |
| RESOLVED | Service restored | Push if original event was CRITICAL or HIGH |
| NOISE | Unverified social signal, no corroboration | Log to DB, do not alert |

Prompt instruction for Claude: Always include repair vessel operator (HMN Tech vs Alcatel Submarine
Networks) when confirmed — this signals repair timeline to trading subscribers.

### Subscriber Segments (inform alert filtering + copy tone)

| Segment | Route focus | Alert threshold | Copy tone |
|---|---|---|---|
| Crypto traders | Atlantic (NY↔London) + Pacific | CRITICAL + HIGH only | Speed-focused, specific ms impact |
| FX/Equity traders | All routes, esp. London↔Singapore | CRITICAL + HIGH + MEDIUM | Risk management language |
| CDN operators | All routes equally | All severities | Capacity + rerouting focus |
| Analysts/journalists | All alerts | Lower threshold — include LOW | Context-heavy, background links |

---

## Known issues / next session work

| Issue | Status |
|---|---|
| No GitHub remote configured | Needs user to create repo at github.com → `git remote add origin` |
| Admin page has no auth gate | DONE — `?key=ADMIN_SECRET` query param check already in place |
| Scraper error handling | DONE (Session 4) — 3-attempt backoff on 429 (5s/15s/60s), Bearer Token support added |
| Dashboard subscriber auth | DONE (Session 3) — cookie-based, /api/auth/callback route |

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
5. ~~Dashboard auth~~ — DONE (Session 3). httpOnly cookie via /api/auth/callback.
6. **First LinkedIn post** — Expert framing: "Why subsea cable cuts move markets before anyone knows"
7. ~~Twitter scraper rate-limit retry~~ — DONE (Session 4). 3-attempt backoff, Bearer Token support.

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

### ✅ Completed in Session 3 (23 May 2026)

- Dashboard auth gate. `/api/auth/callback/route.ts` (NEW): retrieves Stripe checkout
  session, looks up subscriber by stripe_customer_id, sets httpOnly `cablealert_sub`
  cookie (30 days), handles webhook race condition with pending state + meta-refresh.
  `lib/payments.ts`: added `getCheckoutSession()`, updated success_url to point to
  `/api/auth/callback`. `lib/db.ts`: added `getSubscriberById()`. `app/dashboard/page.tsx`:
  full auth gate, Telegram form wired to `updateSubscriberTelegramId`, subscriber email +
  live status badge. Commit: `7be7631`

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
