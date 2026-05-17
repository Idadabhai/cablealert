# CableAlert — CHANGELOG

## [0.1.0] — Session 1 — 2026-05-16

### Built
- Full Next.js 14 App Router scaffold (TypeScript strict mode, Tailwind CSS)
- Supabase schema: 5 tables (subscribers, outage_events, alert_deliveries, scrape_logs, admin_alerts) with RLS
- SQL migration: `supabase/migrations/001_initial_schema.sql`
- Static data files:
  - `data/cables.json` — 10 major cable systems with latency benchmarks
  - `data/routes.json` — 5 priority trading routes with coordinates
  - `data/noc-sources.json` — scraper targets with methods
- Service libraries (all with correct TypeScript signatures):
  - `lib/db.ts` — Supabase client + all DB functions (subscribers, events, logs, admin)
  - `lib/ai.ts` — Claude claude-sonnet-4-20250514 classifier + alert summary generator
  - `lib/telegram.ts` — Bot alert formatter, broadcaster, text sender, webhook setter
  - `lib/email.ts` — Resend: daily digest, welcome email, critical alert
  - `lib/payments.ts` — Stripe: checkout, portal, webhook verifier, MRR calc
- Scrapers:
  - `lib/scrapers/subtelforum.ts` — Cheerio HTML scraper with cable keyword filter
  - `lib/scrapers/twitter.ts` — Twitter API v2 with min-retweet noise filter
  - `lib/scrapers/thousandeyes.ts` — Cheerio with multi-selector fallback
- Cron handlers:
  - `app/api/cron/scrape/route.ts` — 15-min pipeline: scrapers → Claude → DB → Telegram
  - `app/api/cron/digest/route.ts` — 7am UTC daily email digest
- Webhook handlers:
  - `app/api/webhooks/stripe/route.ts` — checkout.session.completed, subscription.deleted, payment_failed
  - `app/api/webhooks/telegram/route.ts` — /start, /stop, /status commands
- Server action: `actions/create-checkout.ts`
- Pages:
  - `app/page.tsx` — Full landing + live outage feed (server-rendered, updates every 15min)
  - `app/subscribe/page.tsx` — Pricing + Stripe checkout
  - `app/dashboard/page.tsx` — Subscriber dashboard + Telegram setup flow
  - `app/admin/page.tsx` — Admin metrics, scrape logs, event history (key-gated)
- Vercel cron config: `vercel.json` (15min scrape + 7am digest)
- Environment: `.env.local.example` with all required variables documented
- TypeScript types: `types/db.ts` — all DB tables + Claude output types

### Manual setup required before deploying
1. Create Supabase project → run SQL migration → copy env vars
2. Create Telegram bot via @BotFather → save TELEGRAM_BOT_TOKEN
3. Create Stripe product "CableAlert Pro" at £50/month → save price ID + webhook secret
4. Apply for Twitter API v2 Basic tier ($100/month) → save 4 API keys
5. Create Resend account → verify `cablealert.io` domain → save API key
6. Deploy to Vercel → set all env vars → set CRON_SECRET
7. Register Telegram webhook: POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={APP_URL}/api/webhooks/telegram

### Next session (Session 2)
- Connect Supabase (run migration, set env vars)
- Test scrape pipeline end-to-end: GET /api/cron/scrape with CRON_SECRET
- Verify outage_events and scrape_logs populate in Supabase
- Fix any TypeScript build errors
- Deploy to Vercel + confirm cron is scheduled
- Post acquisition content: X + r/algotrading + LinkedIn
