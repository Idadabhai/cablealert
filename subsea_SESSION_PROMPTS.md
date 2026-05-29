# CABLEALERT — SESSION PROMPTS & QUICK REFERENCE
# Print this or keep it open in a second window.
# Copy the relevant prompt, paste into Claude Code. Never start a session cold.

---

## BEFORE SESSION 1 — Manual setup (do this first, takes ~30 minutes)

Complete these before running the scaffold prompt:

1. Create a Telegram bot via @BotFather — save the BOT_TOKEN
2. Create a Stripe account — create one product: "CableAlert Pro" at £50/month
   Save STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
3. Apply for Twitter/X API v2 access (Basic tier, ~$100/mo) — save all 4 keys
4. Create a Supabase project — save URL + anon key + service role key
5. Create a Vercel account — connect to your GitHub repo
6. Create a Resend account — save API key, verify your sending domain

---

## SESSION 1 — Project Scaffold (use once, first session only)

Read CLAUDE.md and PRD.md.

Scaffold the CableAlert project from scratch.

Set up:
1. Next.js 14 with App Router, TypeScript strict mode, Tailwind CSS
2. shadcn/ui — install: button, card, badge, table, dialog, toast, separator, progress
3. Supabase client in /lib/db.ts with TypeScript types
4. File structure exactly as defined in CLAUDE.md
5. Stub files with correct TypeScript signatures for:
   /lib/ai.ts, /lib/telegram.ts, /lib/email.ts, /lib/payments.ts
   /lib/scrapers/subtelforum.ts, /lib/scrapers/twitter.ts,
   /lib/scrapers/thousandeyes.ts
6. Static data files in /data/:
   - cables.json — major cable systems from CLAUDE.md with route info
   - routes.json — priority trading routes with latency benchmarks
   - noc-sources.json — scraper targets with URLs and scrape method

Create Supabase database schema for all 5 tables from PRD.md:
- subscribers, outage_events, alert_deliveries, scrape_logs, admin_alerts

For each: SQL migration + RLS policies + TypeScript types in /types/db.ts.

Landing page /app/page.tsx — minimal placeholder:
- Headline: "Real-time subsea cable intelligence for latency-sensitive traders"
- Subheadline: "Get alerts 15 minutes before Twitter does"
- CTA button: "Subscribe — £50/month" linking to /subscribe
- "Recent outages" section: placeholder text "Live feed coming soon"

Deploy to Vercel when done. Configure Vercel Cron in vercel.json:
{
  "crons": [
    { "path": "/api/cron/scrape", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/digest", "schedule": "0 7 * * *" }
  ]
}

Update CHANGELOG.md.

---

## SESSION 2 — US-008 + US-010: Scraper + Claude Classifier

Read CLAUDE.md first. Then read CHANGELOG.md. Then read PRD.md.

Today's task: Build the scraping and classification pipeline — the engine of the product.

Before writing any code:
1. Confirm you understand the cron architecture: Vercel Cron → /api/cron/scrape → scrapers → Claude → DB
2. List every file you will create or modify
3. Note: scrapers must be idempotent — use source_url as deduplication key

Build:
- /lib/scrapers/subtelforum.ts — scrapeSubtelForum():
  * Fetch https://subtelforum.com/news with Cheerio
  * Extract: headline, url, date, body text (first 500 chars)
  * Return array of { headline, url, date, bodyText }

- /lib/scrapers/twitter.ts — scrapeTwitter():
  * Use Twitter API v2 search: "subsea cable" (cut OR outage OR fault OR repair)
  * Filter: past 15 minutes, English only, min 5 retweets (reduce noise)
  * Return array of { text, authorHandle, url, createdAt }

- /lib/ai.ts — classifyOutage(rawText: string, sourceUrl: string):
  * Call Claude API with the exact system prompt from PRD.md
  * Parse JSON response, validate fields
  * Return typed OutageClassification object
  * If Claude returns confidence < 0.6, classify as 'noise' automatically

- /app/api/cron/scrape/route.ts — main cron handler:
  * Verify CRON_SECRET header (security)
  * Run all scrapers in parallel (Promise.all)
  * For each item: check if source_url already exists in outage_events (dedup)
  * If new: call classifyOutage(), save to outage_events table
  * Save scrape run summary to scrape_logs table
  * If classification is 'critical' or 'high': trigger alert (stub for now — Session 3)
  * Return { processed: N, alerts_triggered: N, errors: [] }

Test by hitting /api/cron/scrape manually with the correct CRON_SECRET header.
Verify outage_events and scrape_logs are populated correctly in Supabase.

When done, update CHANGELOG.md.

---

## SESSION 3 — US-001 + US-002: Telegram Alerts

Read CLAUDE.md first. Then read CHANGELOG.md. Then read PRD.md.

Today's task: US-001 and US-002 — send Telegram alerts to subscribers on critical outages.

Build:
- /lib/telegram.ts — sendAlert(chatId: string, event: OutageEvent):
  * Format message using this template:
    🚨 [SEVERITY] CABLE ALERT
    📡 Cable: [CABLE_NAME]
    🌐 Routes affected: [ROUTES]
    ⚡ Latency impact: +[X]ms estimated
    📋 [ALERT_SUMMARY]
    🔗 [SOURCE_URL]
    ─────────────────
    CableAlert · cablealert.io
  * Send via Telegram Bot API sendMessage endpoint
  * Return { success: boolean, telegram_message_id: string }

- Update /app/api/cron/scrape/route.ts:
  * After saving a critical/high event: fetch all active subscribers from DB
  * Call sendAlert() for each subscriber
  * Save result to alert_deliveries table (status: sent or failed)
  * Log any failures but do not throw — partial delivery is acceptable

- /app/api/webhooks/telegram/route.ts — Telegram webhook:
  * Handle /start command: save chat_id to pending_subscribers table
  * Reply: "✅ CableAlert bot connected. Your Telegram ID is [chat_id].
    Enter this in your CableAlert dashboard to activate alerts."

Test end-to-end:
1. Add yourself as a test subscriber directly in Supabase
2. Manually trigger /api/cron/scrape
3. Verify Telegram message is received within seconds

When done, update CHANGELOG.md.

---

## SESSION 4 — US-003 + US-005: Stripe Subscriptions

Read CLAUDE.md first. Then read CHANGELOG.md. Then read PRD.md.

Today's task: US-003 and US-005 — Stripe checkout and subscriber management.

Build:
- /app/subscribe/page.tsx — pricing page:
  * £50/month, billed monthly, cancel anytime
  * Feature list: 15-min alerts / Telegram + email / all major routes /
    daily digest / self-serve cancellation
  * "Subscribe now" button → triggers checkout
  * Trust signals: "Built by a former Colt Technology wholesale director"

- /actions/create-checkout.ts — Stripe Checkout Session:
  * Mode: subscription
  * Price: £50/month recurring (use price ID from Stripe dashboard)
  * Collect email at checkout
  * Success URL: /dashboard?session_id={CHECKOUT_SESSION_ID}
  * Cancel URL: /subscribe

- /app/api/webhooks/stripe/route.ts — webhook handler:
  * checkout.session.completed:
    - Create subscriber row (email, stripe_customer_id, stripe_subscription_id)
    - Status = 'active'
    - Send welcome email via Resend with Telegram setup instructions
  * customer.subscription.deleted: status = 'cancelled', cancelled_at = now
  * invoice.payment_failed: status = 'past_due'

- /app/dashboard/page.tsx — subscriber dashboard (requires active subscription):
  * Subscription status badge (Active / Past Due / Cancelled)
  * Next billing date
  * "Manage subscription" button → Stripe Customer Portal
  * Telegram setup section:
    - Step 1: "Message @CableAlertBot on Telegram and send /start"
    - Step 2: "Copy your Telegram ID from the bot's reply"
    - Step 3: Input field to paste Telegram chat_id → save to subscriber row
  * Recent alerts received (last 10 from alert_deliveries)

When done, update CHANGELOG.md.

---

## SESSION 5 — US-004: Daily Email Digest

Read CLAUDE.md first. Then read CHANGELOG.md. Then read PRD.md.

Today's task: US-004 — daily 7am email digest of all outages in the past 24 hours.

Build:
- /lib/email.ts — sendDailyDigest(subscriber, events: OutageEvent[]):
  * Use Resend to send plain-text email
  * Subject: "CableAlert Daily Digest — [DATE] — [N] events"
  * Body format:
    SUBSEA CABLE INTELLIGENCE DIGEST
    [DATE] | CableAlert

    [N] events detected in the past 24 hours.

    ━━━━━━━━━━━━━━━━━━━━━━━
    🚨 CRITICAL (N)
    ━━━━━━━━━━━━━━━━━━━━━━━
    [For each critical event:]
    Cable: [NAME] | Routes: [ROUTES] | Impact: +[X]ms
    [SUMMARY]
    Source: [URL]

    [Repeat for HIGH, MEDIUM sections]
    ━━━━━━━━━━━━━━━━━━━━━━━
    Manage subscription: [Stripe Portal Link]
    Unsubscribe: [link]

- /app/api/cron/digest/route.ts — daily cron at 7am UTC:
  * Verify CRON_SECRET header
  * Fetch all outage_events from past 24h where severity != 'noise'
  * Fetch all active subscribers
  * Send digest to each subscriber
  * Log to alert_deliveries (channel: 'email')
  * If no events: send "All quiet — no significant outages in the past 24h"

When done, update CHANGELOG.md.

---

## SESSION 6 — US-006 + US-007: Public Landing Page + Heatmap

Read CLAUDE.md first. Then read CHANGELOG.md. Then read PRD.md.

Today's task: US-006 and US-007 — public live feed and world map heatmap.

Build:
- /app/page.tsx — full public landing page:
  * Hero: "Get subsea cable alerts 15 minutes before Twitter does"
  * Sub: "Real-time intelligence for latency-sensitive traders, built by
    a former Colt Technology wholesale director"
  * Live outage feed: last 10 events from outage_events (server-rendered)
    - Severity badge (colour-coded), cable name, routes, time ago, summary
    - Auto-refreshes every 60 seconds (client-side polling)
  * World map heatmap (see component below)
  * Pricing CTA: large "Subscribe — £50/month" button
  * "How it works": 3 steps (We scrape / Claude classifies / You get alerted)
  * Social proof section: "Recent alerts sent to subscribers" (anonymised)

- /components/heatmap/WorldMap.tsx — SVG world map:
  * Use a simplified world map SVG as base (include inline, no external deps)
  * Draw major cable routes as thin lines (use /data/routes.json coordinates)
  * Active outages: highlight affected route in red with pulsing dot animation
  * Resolved outages: highlight in grey
  * No outages: all routes in a subtle blue-green
  * Server-rendered — no client JS needed for initial paint
  * On hover (desktop): tooltip with cable name + current status

When done, update CHANGELOG.md.

---

## SESSION 7 — US-009: Manual Alert + Auto X Posting

Read CLAUDE.md first. Then read CHANGELOG.md. Then read PRD.md.

Today's task: US-009 — admin manual alert trigger and automatic X post on critical events.

Build:
- /app/admin/page.tsx — full admin dashboard:
  * Top metrics: MRR (£) / Active subscribers / Scrape success rate (%) /
    Alerts sent (24h) / Failed deliveries (24h)
  * Manual alert form:
    - Cable name (text input)
    - Affected routes (multi-select from /data/routes.json)
    - Severity (select: critical / high / medium)
    - Message (textarea, max 280 chars)
    - "Send to all subscribers" button
  * Recent scrape log (last 20 runs): source, status, items found, duration
  * Recent alert log: event, subscribers reached, failures

- /actions/send-manual-alert.ts — Server Action:
  * Validate inputs
  * Save to admin_alerts table
  * Send Telegram alert to all active subscribers
  * Log to alert_deliveries

- Auto X post on CRITICAL events (add to cron scrape handler):
  * When a new CRITICAL event is saved, generate post text:
    "🚨 SUBSEA CABLE ALERT
    📡 [CABLE_NAME] — [SEVERITY]
    🌐 Affected: [ROUTES]
    ⚡ Latency impact: +[X]ms estimated
    [SUMMARY]
    Full details → cablealert.io
    #SubseaCable #NetworkOutage #Latency"
  * Post to X via Twitter API v2 (use /lib/twitter.ts helper)
  * Save tweet URL to outage_events.x_post_url

When done, update CHANGELOG.md.

---

## WEEKLY PLANNING PROMPT (use every Monday)

Read CLAUDE.md, CHANGELOG.md, and PRD.md. Do not write any code.

Give me a planning summary:
1. What has been built so far (from CHANGELOG — be specific)
2. Which PRD.md user stories are complete vs outstanding
3. Scraper health: are all 3 sources returning data reliably?
4. Subscriber count and MRR — are we on track for month 3 target?
5. The single highest-leverage thing to build or fix this week

Plain English only. No code. No lists of lists.

---

## BUG FIX PROMPT

Read CLAUDE.md.

I have a bug.

What is happening: [DESCRIBE EXACTLY WHAT YOU SEE]
What should happen: [DESCRIBE EXPECTED BEHAVIOUR]
Where it happens: [PAGE / ACTION / FLOW / CRON JOB]
Relevant file: [FILE PATH IF KNOWN]
Error message: [PASTE EXACT ERROR FROM VERCEL LOGS OR BROWSER CONSOLE]

Rules:
- Explain what caused the bug BEFORE writing any fix
- Fix only this bug — do not refactor anything else
- Do not add new features while fixing
- Cron job fixes must be tested by triggering the endpoint manually first
- Confirm the fix works before updating CHANGELOG.md

---

## SUBSCRIBER ACQUISITION PLAN (do this in parallel with building)

Week 1 — While building sessions 1-2:
- Post on X: "Building a real-time subsea cable outage alert service for traders.
  15-min Telegram alerts when cables cut. Would you pay £50/mo?"
- Post on r/algotrading, r/networking, r/cryptocurrency with the concept
- DM 10 quantitative traders / HFT infrastructure people on LinkedIn

Week 2 — While building sessions 3-4:
- Write one LinkedIn article: "The Red Sea Cable Crisis: What Traders Need to Know"
  (use your Colt knowledge — this will get shared)
- Submit to Hacker News "Show HN" on launch day

Week 3 — After MVP deployed:
- Every time a real cable outage happens, post the heatmap to X immediately
- These posts are the acquisition engine — do not skip this

Month 1 subscriber target: 5 paying at £50/mo = £250 MRR
Month 2 subscriber target: 14 paying at £50/mo = £700 MRR
Month 3 subscriber target: 28 paying at £50/mo = £1,400 MRR
