# CHANGELOG.md
# Format: [version] — [date] — [what was built]
# Updated by Claude Code at the end of every session.
# Read this at the start of every session to understand current state.
# Never delete old entries — this is a running log.

## [Unreleased]
## Next session priorities
- Session 1 scaffold still outstanding (see pending items below)
- All cron/scraper/Telegram/Stripe work not yet built
- Twitter/X API credentials needed before scraper work begins
- Live CLAUDE.md for the built scaffold is at cablealert/CLAUDE.md (separate from this planning file)

---

## v0.2.0 — SEO/AEO/GEO overhaul — Session 58, 17 May 2026
### Added (to cablealert/ subfolder — the live Next.js app)
- app/layout.tsx: metadataBase, title.template, keywords (9 terms), full OG/Twitter metadata
- app/page.tsx: FAQPage JSON-LD (6 questions), SoftwareApplication JSON-LD schema,
  visible FAQ section (id="faq"), GEO stats strip:
  "95% of internet traffic travels via subsea cables (TeleGeography 2024)"
  "Average repair time: 2–4 weeks (ICPC 2023)"
  "Alert lead time: 15 min ahead of public sources"
  Red Sea / Houthi expert callout (HMN Tech, Alcatel repair vessels referenced)
- app/robots.ts: NEW — disallows /admin /dashboard /api
- app/sitemap.ts: NEW — homepage (daily), /subscribe (monthly)
- .gitignore: NEW
- cablealert/CLAUDE.md: NEW — full session bootstrap with architecture, env vars, cron config,
  Founder's Unfair Advantage framing (11 years Colt Technology, Optical/Wholesale)
### Commits: 5fba4c5, 26f704d

---

## v0.1.0 — Project initialised — April 2026
### Added
- subsea_CLAUDE.md created (project memory + conventions) — this is the planning file
- subsea_PRD.md created (10 user stories, MVP scope defined)
- subsea_CHANGELOG.md created (this file)
### Note
- The live Next.js app lives in the cablealert/ subfolder
- Live session bootstrap is at cablealert/CLAUDE.md (created Session 58)
- This subsea_CHANGELOG.md and subsea_CLAUDE.md are the original planning artefacts

### Pending (Session 1 — Scaffold)
- Next.js 14 project scaffolded with TypeScript + Tailwind + shadcn/ui
- Supabase project created and all 5 tables migrated with RLS policies
- TypeScript types generated in /types/db.ts
- Static data files: /data/cables.json, /data/routes.json, /data/noc-sources.json
- Stub files created: /lib/db.ts, /lib/ai.ts, /lib/telegram.ts,
  /lib/email.ts, /lib/payments.ts, /lib/scrapers/
- Telegram bot created via @BotFather, token saved to .env.local
- Stripe subscription product created (£50/mo)
- Environment variables configured (.env.local)
- Blank app deployed to Vercel with placeholder homepage

### Pending (Session 2 — US-008 + US-010: Scraper + Classifier)
- /lib/scrapers/subtelforum.ts — scrape SubTel Forum news page
- /lib/scrapers/twitter.ts — search Twitter/X API for cable outage signals
- /lib/scrapers/thousandeyes.ts — fetch ThousandEyes outage feed
- /lib/ai.ts — classifyOutage(rawText, sourceUrl) using Claude API
- /app/api/cron/scrape/route.ts — Vercel Cron (every 15 min):
  run all scrapers → classify each item → save to outage_events + scrape_logs
- Manual test: trigger cron manually, verify classification output in DB

### Pending (Session 3 — US-001 + US-002: Telegram Alerts)
- /lib/telegram.ts — sendAlert(chatId, outageEvent) Telegram Bot API
- Alert trigger logic in cron: if classification is critical or high,
  fetch all active subscribers and send Telegram alert
- alert_deliveries rows created for each send attempt
- Test end-to-end: trigger a test outage → verify Telegram message received

### Pending (Session 4 — US-003 + US-005: Stripe Subscriptions)
- /app/subscribe/page.tsx — pricing page (£50/mo, feature list, CTA)
- /actions/create-checkout.ts — Stripe Checkout Session server action
- /app/api/webhooks/stripe/route.ts — webhook handler:
  * checkout.session.completed → create subscriber row, status = active
  * customer.subscription.deleted → update status = cancelled
  * invoice.payment_failed → update status = past_due
- /actions/create-portal.ts — Stripe Customer Portal link server action
- /app/dashboard/page.tsx — subscriber dashboard:
  * Subscription status + next billing date
  * "Manage subscription" → opens Stripe Portal
  * Telegram connection status + instructions to set up

### Pending (Session 5 — US-004: Email Digest)
- /lib/email.ts — sendDailyDigest(subscriber, outageEvents[])
- /app/api/cron/digest/route.ts — Vercel Cron (daily at 7am UTC):
  fetch all CRITICAL/HIGH events from past 24h → send digest to all
  active email subscribers
- Email template: plain text, clear formatting, each outage on its own line
- alert_deliveries rows created for each email send

### Pending (Session 6 — US-006 + US-007: Public Landing Page + Heatmap)
- /app/page.tsx — public landing page:
  * Hero: "Get subsea cable alerts before Twitter does"
  * Live feed: last 10 outage events from DB (no auth required)
  * World map heatmap showing active outages
  * Pricing CTA: "£50/month — cancel anytime"
- /components/heatmap/ — SVG world map with route overlays
  * Active outages shown in red with pulsing animation
  * Affected cable routes highlighted
  * Renders on server (no client-side JS required for SEO)

### Pending (Session 7 — US-009: Manual Alert + Auto X Post)
- /app/admin/page.tsx — admin dashboard:
  * MRR, active subscribers, scrape success rate, alerts sent 24h
  * Scrape log table with source, status, items found, duration
  * Manual alert form: cable name, routes, severity, message → send to all
- Auto X post on CRITICAL events:
  * Generate heatmap image → post to X via Twitter API v2
  * Post caption format from PRD.md viral strategy section

### Pending (Session 8 — US-008 + US-010: Full Admin Dashboard)
- Full scrape log viewer: source, raw text, Claude classification, action
- Filter by: source / severity / date range
- Re-classify button: re-run Claude on a specific scrape item
- Subscriber management table: email, Telegram, status, MRR, joined date

---
# Claude: add new entries above this line.
# Format each entry with: version, date, ### Added / ### Fixed / ### Pending
