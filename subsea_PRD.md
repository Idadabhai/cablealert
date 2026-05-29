# PRD.md — Product Requirements Document
# Version: 0.1.0 (MVP)
# Rule: Every feature must be a user story. No story = not a feature.
# Rule: If it's not in this document, Claude Code will not build it.
# Last updated: April 2026

## Product
Name:      CableAlert
Tagline:   Real-time subsea cable outage intelligence for latency-sensitive traders.
Version:   0.1.0 (MVP)

## The Core Loop (must work end-to-end before anything else is built)
Vercel Cron runs every 15 minutes
→ Scrapers pull from NOC feeds, SubTel Forum, Twitter/X
→ Claude API classifies each item: outage / maintenance / resolved / noise
→ If CRITICAL or HIGH: generate plain-English alert with route + latency impact
→ Push alert to all relevant Telegram subscribers instantly
→ Send email digest to email subscribers (hourly batching)
→ If CRITICAL: auto-generate latency heatmap image + post to X and LinkedIn
→ Admin sees full scrape log, classification results, alert delivery status

## Users
Subscriber:   Quantitative trader, crypto arbitrageur, CDN operator, or
              telecom analyst paying £50/month for real-time alerts.
Free viewer:  Anyone visiting the public landing page to see the live
              outage feed — the top of the conversion funnel.
Admin:        Founder (you) — monitoring scrape health, managing subscribers,
              manually triggering alerts if needed.

## MVP Scope
# Max 10 user stories. Everything else is v1 or v2.

### Subscriber Stories

US-001  As a subscriber, I want to receive a Telegram message within
        15 minutes of a confirmed subsea cable outage being detected,
        so that I can act before the broader market is aware.

US-002  As a subscriber, I want each alert to tell me: which cable,
        which route, severity level, and estimated latency impact in
        plain English (not technical jargon),
        so that I can immediately understand the trading implication.

US-003  As a subscriber, I want to sign up and pay £50/month via a
        simple Stripe Checkout page, entering only my email and
        Telegram username,
        so that I can be set up and receiving alerts in under 5 minutes.

US-004  As a subscriber, I want to receive a daily email digest at 7am
        summarising all outages detected in the past 24 hours,
        so that I have a record even if I missed a Telegram alert.

US-005  As a subscriber, I want to manage or cancel my subscription
        via a self-serve Stripe Customer Portal link,
        so that I never need to email anyone to make changes.

### Free Viewer Stories

US-006  As a free viewer, I want to see a live public feed of recent
        cable outages on the landing page (last 10 events, no login needed),
        so that I can evaluate whether the service is worth subscribing to.

US-007  As a free viewer, I want to see an auto-updating world map
        heatmap showing active outages and affected routes,
        so that I get an immediate visual sense of the current cable health.

### Admin Stories

US-008  As an admin, I want to see a dashboard showing: total active
        subscribers, monthly recurring revenue (MRR), scrape success
        rate, alerts sent in last 24h, and any failed scrape jobs,
        so that I can monitor the health of the product in one place.

US-009  As an admin, I want to manually trigger an alert (with custom
        text, severity, and affected route) and send it to all subscribers,
        so that I can push breaking news I spot before the scrapers catch it.

US-010  As an admin, I want to see the full scrape log (source, raw text
        extracted, Claude classification, action taken) for the last 48
        hours, so that I can debug missed outages or false positives.

## Acceptance Criteria (MVP is done when ALL of these are true)
- [ ] Cron job runs every 15 minutes and scrapes at least 3 NOC sources
- [ ] Claude API correctly classifies outage vs. noise with >85% accuracy
      (manually verify against known recent outages)
- [ ] Telegram alert delivered to test subscriber within 15 min of outage
- [ ] Stripe Checkout works end-to-end — subscriber added to DB on payment
- [ ] Daily 7am email digest sends correctly via Resend
- [ ] Public landing page shows live feed of last 10 events
- [ ] Heatmap renders correctly on desktop and mobile
- [ ] Admin dashboard shows MRR and scrape health
- [ ] Manual alert trigger works from admin panel
- [ ] App deployed to live Vercel URL with cron jobs active

## Out of Scope for MVP
- API access tier (v1)
- Slack integration (v1)
- Route-specific alert filtering by subscriber (v1)
- Custom latency threshold alerts (v1)
- Historical latency data charts (v1)
- Enterprise tier / custom contracts (v2)
- BGP anomaly detection via RIPE NCC (v1 — complex, add after core works)
- iOS / Android native app (v2)
- White-label for brokers or exchanges (v2)
- Automatic X / LinkedIn posting (include at MVP for virality — see US-007)

## Revenue Model
MVP:    £50/month per subscriber via Stripe recurring subscription
        No free trial at MVP — use the public live feed as the trial
        Cancel anytime via Stripe Customer Portal (self-serve)
v1:     £200/month API tier — programmatic access + route filtering
v2:     £500/month enterprise — Slack, custom routes, SLA, invoice billing

## North Star Metric
Monthly Recurring Revenue (MRR).
Secondary: Number of active paying subscribers.
Target month 1: 5 subscribers = £250 MRR
Target month 2: 14 subscribers = £700 MRR
Target month 3: 28 subscribers = £1,400 MRR

## Database Tables Required (for scaffold session)
- subscribers (id, email, telegram_chat_id, telegram_username,
               stripe_customer_id, stripe_subscription_id,
               status [active/cancelled/past_due], subscribed_at,
               cancelled_at, created_at, updated_at, deleted_at)
- outage_events (id, source_url, source_name, raw_text_extracted,
                 claude_classification [critical/high/medium/low/noise/resolved],
                 cable_name, affected_routes[], severity,
                 alert_summary, latency_impact_ms, alert_sent_at,
                 x_post_url, created_at, updated_at)
- alert_deliveries (id, outage_event_id, subscriber_id,
                    channel [telegram/email], status [sent/failed],
                    sent_at, error_message, created_at)
- scrape_logs (id, source_name, source_url, status [success/failed],
               items_found, items_classified, duration_ms,
               error_message, created_at)
- admin_alerts (id, triggered_by, cable_name, affected_routes[],
                severity, message, sent_at, recipient_count, created_at)

## Scraper Priority Order (build in this sequence)
1. SubTel Forum news page — static HTML, easiest to parse, high signal
2. Twitter/X search — real-time, noisy but fastest signal
3. ThousandEyes outage feed — reliable, structured data
4. Kentik Internet Outage feed — good for BGP-level events
5. TeleGeography cable map — authoritative but slower to update

## Claude Classification Prompt (exact prompt for /lib/ai.ts)
System: "You are a subsea cable network expert with 15 years of experience
reading NOC reports and outage notifications. You understand how cable
consortium announcements are structured and can distinguish real outages
from planned maintenance, noise, and false positives.

Classify the following text and return JSON only:
{
  classification: 'critical' | 'high' | 'medium' | 'low' | 'noise' | 'resolved',
  cable_name: string | null,
  affected_routes: string[],
  latency_impact_estimate_ms: number | null,
  alert_summary: string (max 280 chars, plain English, trading-focused),
  confidence: number (0-1)
}

Classification rules:
- critical: confirmed cut, weeks to repair, major route affected
- high: partial capacity loss or unplanned outage, hours to days
- medium: planned maintenance with known window, or minor degradation
- low: unconfirmed reports, minor impact, within normal variance
- noise: social media speculation, unrelated content, duplicates
- resolved: service restored (include restoration time in summary)"

## Viral Distribution Strategy (built into MVP)
Every CRITICAL outage automatically:
1. Generates a world map SVG heatmap showing affected routes in red
2. Posts to X with caption: "🚨 SUBSEA ALERT: [CABLE] cut detected.
   [ROUTE] latency impact: +[X]ms. [SUMMARY]. Full analysis 👇 [link]"
3. These posts get shared by traders, journalists, and telecom professionals
4. Each viral post drives 50–200 new visitors to the landing page
5. Landing page has prominent "Get alerts before Twitter does" CTA

## v1.0 Scope (weeks 7–16)
- Route-specific filtering (subscriber chooses Atlantic / Pacific / Red Sea)
- API access tier at £200/month with documented REST endpoints
- Slack integration for team accounts
- BGP anomaly detection via RIPE NCC stat API
- Historical outage database (searchable, past 12 months)
- Custom latency threshold alerts per subscriber
- Weekly intelligence report PDF (emailed every Monday)

## v2.0 Scope (weeks 17–32)
- Enterprise tier: custom SLAs, invoice billing, dedicated Slack channel
- White-label version for exchanges and brokers
- Predictive risk scoring (Red Sea routes, weather patterns)
- Integration with financial data terminals (Bloomberg, Refinitiv)
- Mobile app with push notifications
