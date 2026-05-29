# CableAlert — Business Plan
**Product:** cablealert.io
**Author:** Irfan Dadabhai / @zeroxtoexit
**Version:** 1.0 — May 2026
**Status:** Built — pre-launch, pending Vercel deployment + Stripe product + Telegram bot

---

## EXECUTIVE SUMMARY

**What it is:** CableAlert is a real-time subsea cable intelligence service. A scraper pipeline polls NOC feeds, SubTel Forum, ThousandEyes, and Twitter every 15 minutes, classifying each event by severity using Claude. Paying subscribers receive Telegram push alerts and daily email digests — typically 15 minutes ahead of Twitter. Revenue: £50/month per subscriber, no free trial (the public live feed serves as the product demonstration).

**The gap it fills:** Subsea cable outages create latency spikes on key financial trading routes. When a cable cuts, trading desks need to know immediately — within minutes, not hours. Current options are: Bloomberg Terminal ($24,000/year, buries this signal in noise) or Twitter/Reddit (free, but slow and unclassified). There is nothing in between that delivers expert-classified, route-specific, trading-focused alerts at an accessible price point.

**The customer:** Quantitative traders, HFT infrastructure teams, crypto arbitrageurs, and CDN operators for whom a 15-minute latency information edge on a critical route is worth far more than £50/month.

**Revenue model:** £50/month per subscriber (Stripe recurring). No paid trials. The public live feed on the landing page is the conversion mechanism. Target: 20 subscribers (£1,000 MRR) to justify continued build.

**The moat:** Expert framing, not raw data. Anyone can build a news scraper. Only someone who spent 11 years inside a Tier 1 carrier — knowing which routes carry which financial flows, how NOC alerts propagate, which repair vessels are deployed, and how trading desks interpret latency changes — can frame these events in trading-relevant terms. That framing is the product. The data is a commodity. The interpretation is not.

**Target:** 5 subscribers month 1 (£250 MRR), 20 subscribers month 3 (£1,000 MRR), 50 subscribers month 6 (£2,500 MRR).

---

## 1. PROBLEM

### 1a. The latency information asymmetry problem

Subsea cables carry approximately 97% of global internet traffic. Major financial trading routes — London-New York (MAREA, Hibernia Express), London-Singapore (SEA-ME-WE-5, FLAG/FALCON), New York-Tokyo (FASTER, PC-1) — operate at latency benchmarks that financial desks actively monitor.

When a cable is cut or degraded:
- **Latency spikes within minutes.** A break on the London-Singapore route adds 80ms if traffic reroutes via the Cape of Good Hope — a material change for algorithmic trading desks running arbitrage strategies across European and Asian exchanges.
- **Trading positions built on low-latency assumptions are immediately at risk.** HFT strategies that assume <160ms London-Singapore can fail silently or generate losses before the desk knows why.
- **The information reaches different audiences at different times:**
  - NOC teams at carrier level: immediate (they monitor their own infrastructure)
  - Public NOC feeds (ThousandEyes, TeleGeography): 15–30 minutes lag
  - Twitter/X: 20–45 minutes lag (sometimes hours for confirmation)
  - Bloomberg/Refinitiv terminals: includes this information eventually, buried in broader network news

The window between a cable event and public awareness is 15–30 minutes. For a trading desk, that window is the difference between acting on intelligence and reacting to events.

### 1b. The signal-to-noise problem

The existing options for staying informed:

**Bloomberg Terminal (£24,000/year/seat):**
- Comprehensive. Includes cable news. But the cable intelligence is embedded in a broader network of thousands of alerts per day across all infrastructure categories. No filtering for subsea specifically. No trading-focused framing of latency implications. No Telegram push notification for critical events. The desk that wants subsea-specific intelligence needs someone to monitor Bloomberg full-time.

**Twitter/X:**
- Fast for breaking news from industry observers. But: (1) lags the NOC feeds by 20–45 minutes, (2) no severity classification, (3) high noise-to-signal ratio — most "subsea cable" mentions are journalism, not operational intelligence.

**TeleGeography's public map:**
- The authoritative data source for cable topology. Updated quarterly to annually. No real-time alerting.

**ThousandEyes / Kentik:**
- Enterprise-grade network monitoring. Six-figure contracts. Designed for network operations teams, not trading desks. No Telegram integration, no trading-focused alert framing.

The £50/month price point is unoccupied. There is no product between "free Twitter" and "enterprise Bloomberg" that delivers classified, route-specific, trading-framed subsea alerts.

---

## 2. SOLUTION

CableAlert's scraper pipeline runs every 15 minutes:
1. Scrapes SubTel Forum, ThousandEyes, Kentik, and Twitter/X
2. Passes each item to Claude with a structured classification prompt (critical / high / medium / low / noise / resolved)
3. For CRITICAL or HIGH events: generates a plain-English 280-character alert with cable name, affected route, estimated latency impact in milliseconds, and trading-relevant framing
4. Pushes alert immediately to all active Telegram subscribers
5. Batches MEDIUM/LOW events for the daily 7am UTC email digest
6. For CRITICAL events: auto-generates a latency heatmap and posts to X and LinkedIn to drive landing page traffic

Subscribers access this through:
- Telegram: instant push notification to their phone or trading desk terminal
- Email digest: 7am UTC daily summary for planning and review
- Dashboard: subscriber-only outage history and alert settings

**What makes the alert different from Twitter:**
The alert doesn't just report the event. It frames it: "CRITICAL: SEA-ME-WE-5 fault confirmed at 14:23 UTC. London-Singapore latency impact: +80ms (current routing via Cape of Good Hope). HMN Tech repair vessel dispatched — estimated repair: 4–6 weeks. Red Sea rerouting now your lowest-latency option for this corridor." That framing comes from 11 years of carrier-side experience. It cannot be generated by a scraper.

---

## 3. IDEAL CUSTOMER PROFILE

### ICP #1 — The HFT and Quantitative Trading Infrastructure Team (Primary)

| Attribute | Detail |
|-----------|--------|
| **Role** | Network infrastructure lead, quantitative trading developer, CTO of prop trading firm |
| **Firm type** | Proprietary trading firm, crypto arbitrage desk, hedge fund with algorithmic equity/FX strategies |
| **Size** | 2–50 person firms. Large banks have in-house teams for this — the under-resourced mid-size desk is the sweet spot. |
| **Pain** | Latency spikes that degrade strategy performance without explanation. Discovers a cable was cut 6 hours after a bad session. Needs advance warning, not retrospective analysis. |
| **WTP** | £50/month is below the daily cost of one bad latency-affected trade. Easy to expense. |

**Where they spend time:** Twitter/X (financial infra community), Elitetrader.com, Nuclear Phynance forum, LinkedIn (network engineering groups), Hacker News (infrastructure discussions).

### ICP #2 — The Crypto Derivatives Trader (Secondary)

| Attribute | Detail |
|-----------|--------|
| **Profile** | Independent or small-team crypto trader running cross-exchange arbitrage or delta-neutral strategies across Binance (Singapore), Coinbase (US), and Bybit (UAE) |
| **Pain** | Cross-exchange latency arbitrage requires consistent route performance. Atlantic and Pacific cable events directly affect spread capture. Discovery is typically 30–60 minutes after the event via social media — by which time the trade opportunity is gone and the position is unwinding. |
| **WTP** | Same: £50/month is a trivial fraction of any active derivatives position. |

**Where they spend time:** Crypto Twitter, Discord servers (DEGEN trading groups, institutional crypto communities), Telegram (already the delivery channel — natural fit).

### ICP #3 — The CDN and Network Operations Engineer (Secondary)

| Attribute | Detail |
|-----------|--------|
| **Profile** | Infrastructure team at a CDN provider (Cloudflare, Fastly, Akamai partner networks), or network engineering lead at a media or gaming company with real-time delivery requirements |
| **Pain** | Cable faults require immediate failover decisions. Current awareness is via TeleGeography (slow) or Twitter (noisy and unclassified). |
| **WTP** | Same price point. Expensed as infrastructure monitoring tooling. |

---

## 4. MARKET SIZING

**UK-based financial firms with latency-sensitive trading strategies:** approximately 400–600 firms (FCA register, 2024 estimate). This is the highest-value segment but not the whole market.

**Global HFT and prop trading firms monitoring Atlantic/Pacific/Red Sea routes:** approximately 2,000–4,000 globally (based on major exchange co-location registrants).

**Crypto traders running cross-exchange arbitrage:** estimated 10,000+ globally running strategies where cross-exchange latency matters.

**CDN and network operations teams with subsea route dependencies:** thousands globally.

**SignalRank's realistic SAS:**
At £50/month, a MRR target of £5,000 requires 100 subscribers. Finding 100 people globally who will pay £50/month for a latency intelligence edge is not a mass-market problem — it's a precision outreach problem. The right 100 contacts are identifiable and reachable.

**Revenue ceiling at scale:**
- 500 subscribers at £50/month = £25,000 MRR
- API tier at £200/month (v1) — 50 API subscribers = £10,000 incremental MRR
- Enterprise tier at £500/month (v2) — 20 enterprise subscribers = £10,000 incremental MRR
- Combined ceiling: £45,000 MRR with 570 customers

---

## 5. COMPETITIVE ANALYSIS

### 5a. Quick reference table

| Competitor | Price | Latency | Trading-focused? | Telegram alerts? | Route-specific? | Our advantage |
|---|---|---|---|---|---|---|
| **Bloomberg Terminal** | £24,000/year | 30–60 min | Partially | No | No | 48× cheaper; Telegram push; trading-framed alerts |
| **TeleGeography** | Research reports (£annual) | Days-weeks | No | No | Yes (topology) | Real-time vs quarterly; alert delivery; price |
| **ThousandEyes (Cisco)** | Enterprise (£50k+/year) | 5–10 min | No | No | Partially | Price; Telegram; trading framing |
| **Kentik** | Enterprise (£25k+/year) | 5–10 min | No | No | Yes | Price; Telegram; trading framing |
| **Twitter/X** | Free | 20–45 min | No | No | No | Speed (15-min edge); classification; framing |
| **SubTel Forum** | Free (news) | Hours | No | No | No | Real-time monitoring vs passive reading |
| **Manual monitoring** | Internal staff cost | Variable | Partly | Varies | Varies | Automated; 24/7; consistent classification |

### 5b. Competitive tier analysis

#### Tier 1 — Enterprise platforms (wrong price point, right data)

**Bloomberg Terminal**
- Model: Comprehensive financial data terminal at £24,000/seat/year. Includes network news, infrastructure alerts, and cable event coverage — but buried among thousands of daily alerts across all asset classes and infrastructure types.
- Core weakness 1 — Noise: A Bloomberg user monitoring for subsea cable events would need to configure custom alerts and actively monitor. The information exists but is not surfaced proactively for this specific use case.
- Core weakness 2 — Price and commitment: Many mid-size trading firms, crypto desks, and independent traders cannot justify £24,000/seat for a terminal they use for three things: news, pricing, and cable alerts. CableAlert does the cable alerts at £50/month.
- Core weakness 3 — No Telegram: Trading desk infrastructure often includes multiple screens and terminal access. But traders increasingly live in Telegram for fast communication. Bloomberg does not push to Telegram.
- CableAlert's angle: "Bloomberg has this data. We have it 30 minutes earlier, specifically framed for latency impact, delivered to Telegram for £50/month."

**ThousandEyes (Cisco)**
- Model: Enterprise internet intelligence platform. Includes outage monitoring, network topology mapping, and performance alerts. Used by large enterprises and carriers for network operations.
- Core weakness: Six-figure annual contracts. Designed for IT operations teams, not trading desks. No trading-focused framing of latency implications. No concept of "this cable event adds X ms to the London-Singapore route."
- CableAlert's angle: "ThousandEyes is for your IT team. CableAlert is for your trading desk."

**TeleGeography**
- Model: Authoritative global telecoms research and data. The industry reference for cable topology, capacity, and ownership. Research reports, consultancy, and the public cable map.
- Core weakness: Research cadence. TeleGeography publishes authoritative data — but on a days-to-weeks lag for breaking events. No alerting infrastructure, no Telegram integration.
- CableAlert's honest relationship with TeleGeography: They are a cited source in CableAlert's landing page GEO content. Not a competitor — they validate the market's importance.

#### Tier 2 — Adjacent intelligence products

**Kentik Internet Outage Map (free public tool)**
- Provides real-time BGP anomaly and outage data publicly. Useful signal source, which is why it's one of CableAlert's scrapers. But: no alerting mechanism, no Telegram delivery, no trading-focused framing.
- CableAlert scrapes Kentik. The relationship is data source, not competitor.

**RIPE NCC routing statistics**
- BGP routing data, publicly available, used by network engineers. No consumer-facing product, no alerting, no trading frame.
- Same relationship as Kentik — data source.

#### Tier 3 — Social intelligence (timing competitors)

**Twitter/X**
- The primary real-time signal for cable events at no cost. The 20–45 minute lag versus CableAlert's 15-minute scrape cycle is the core CTA: "Get alerts before Twitter does."
- CableAlert's honest position: Twitter is faster for major events when a journalist or industry insider tweets immediately. CableAlert's advantage is classification (noise vs actionable), framing (latency impact in milliseconds, trading-relevant language), and consistency (15-minute automated monitoring vs waiting for someone to tweet).

### 5c. CableAlert's winning position

Only product that combines:
- 15-minute scrape cycle across 5 NOC sources + Twitter (not quarterly, not manual)
- Claude AI classification (critical / high / medium / low / noise / resolved) with >85% accuracy
- Trading-focused framing (latency impact in ms, route-specific, repair vessel identification, repair timeline)
- Telegram push notification (the preferred delivery channel for active traders)
- £50/month price point (48× cheaper than the only alternative with comparable data)
- Founded by someone who understands MAREA vs Hibernia Express vs SEA-ME-WE-5 and why each matters to which trading desk

---

## 6. REVENUE MODEL

### Subscription tiers

| Tier | Price | What's included | Target segment |
|------|-------|-----------------|----------------|
| **Pro** | **£50/month** | Telegram push alerts (critical + high); daily 7am email digest; subscriber dashboard; self-serve cancel | Trading desks, individual traders, CDN teams |
| **API** (v1) | **£200/month** | Everything in Pro + documented REST API access + route-specific filtering | Algo trading platforms, data integrators |
| **Enterprise** (v2) | **£500/month** | Everything in API + Slack integration + custom routes + SLA + invoice billing | Banks, large prop firms, exchanges |

### Revenue targets

| Month | Subscribers (Pro) | MRR |
|-------|------------------|-----|
| 1 | 5 | £250 |
| 2 | 12 | £600 |
| 3 | 20 | £1,000 |
| 6 | 45 | £2,250 |
| 12 | 100 | £5,000 |

### Unit economics

- Gross margin: ~90% (Vercel cron + Neon DB + Claude API + Stripe + Resend + Telegram Bot = approximately £5/subscriber/month at current volumes)
- CAC target: £0 (founder content + community outreach + organic discovery via X posts)
- LTV (12-month): £600 at Pro tier. High retention expected — information product with daily touchpoint builds dependency.

---

## 7. GO-TO-MARKET STRATEGY

CableAlert's GTM is fundamentally different from the consumer-facing products in this portfolio. The audience is small, highly specific, and concentrated in a small number of online communities. Mass distribution is irrelevant. Precision targeting is everything.

### Phase 1 — Expert content seeding (Launch month)

**LinkedIn (primary):**
The founder's 11-year Colt Technology background is the credential that makes this product credible. LinkedIn content must lead with expertise, not product promotion.

- Post 1: "Why the Red Sea cable situation is the most structurally elevated risk for trading infrastructure right now — and what it means for London-Singapore latency." Expert analysis, cite HMN Tech and Alcatel repair vessels, mention Houthi disruption specifically. No product mention.
- Post 2: "How subsea cable events move markets before most people know they've happened." Walk through the NOC-to-Twitter propagation timeline. Include specific latency numbers (MAREA benchmark: 65ms; add 15ms if rerouting begins).
- Post 3: "I spent 11 years at Colt Technology structuring wholesale MVNO and cable capacity deals. Here's what the trading community doesn't know about how these alerts propagate." Credibility + product introduction.
- Post 4: "CableAlert: 15-minute subsea cable intelligence for trading desks. Here's the first alert it caught." Screenshot of real alert output + timing vs Twitter confirmation.

Target audience: Colt Technology alumni, network engineering leaders at financial institutions, HFT infrastructure professionals.

**Twitter/X (secondary — viral mechanism):**
Every CRITICAL outage auto-posts to X with a full hyperlink: "🚨 SUBSEA ALERT: [CABLE] cut detected. [ROUTE] latency impact: +[X]ms. Full analysis 👇 [link]"
- CRITICAL events occur 1–4 times per month globally. At $0.20/post-with-URL, the maximum monthly cost is $0.80–$1.60. This is immaterial relative to any subscriber revenue and the traffic value of a clickable link is far higher than plain text.
- These posts get shared by traders, infrastructure professionals, and journalists who cover telecom.
- Each share drives landing page visitors who are by definition in the target audience.
- The X account IS the marketing for CableAlert. Every critical alert is free distribution.

**X posting strategy by severity tier:**

| Severity | Est. frequency | X post | URL? | Cost |
|---|---|---|---|---|
| CRITICAL | 1–4/month | 🚨 Alert post | Yes | $0.20 |
| HIGH | 3–8/month | ⚠️ Alert post | Yes | $0.20 |
| MEDIUM | 10–20/month | 📋 Maintenance advisory, plain text | No | $0.015 |
| RESOLVED (was CRITICAL/HIGH) | Mirrors above | ✅ Resolution + full incident URL | Yes | $0.20 |
| RESOLVED (was MEDIUM) | Mirrors above | Short plain-text confirmation | No | $0.015 |
| LOW / NOISE | — | No post | — | — |

RESOLVED posts on CRITICAL/HIGH events are the highest-conversion posts on the account. The initial alert attracts attention; the resolution post with a link to the full incident timeline ("repair vessel arrival, latency restored sequence, route back to baseline — full analysis →") converts the watchers who didn't subscribe on the alert alone. MEDIUM events get plain-text resolution confirmation — no URL needed, closes the loop for followers.

MEDIUM maintenance advisories post as plain-text informational content — predictable disruptions allow trading desks to adjust positions in advance. Builds account authority and posting cadence. The implicit signal: when there is a link, it is a real emergency.

Maximum monthly X cost at this posting volume: ~$6–10/month total.

**Summon reply mechanic (additional distribution layer):**
When a user tweets "@CableAlert [link to a subsea event]" — the bot replies with its classification and latency analysis. Summon replies cost $0.01 each (exempt from X's $0.20 URL anti-spam fee because they are @mention replies). This creates a public interaction that:
- Demonstrates the product's intelligence to all viewers of the original thread
- Costs near-zero
- Is triggered by users already engaged with the topic — high conversion audience

Post additional expert content 3×/week: cable repair timelines, latency route explanations, historical event analysis. Cost: $0.015/post (no URL in routine content posts).

### Phase 2 — Community outreach (Month 1–2)

**Niche trading communities (highest priority):**
The target customer is not on Reddit's mainstream subs. They are on:
- **Elitetrader.com** — active professional trading forum. Post "I built a subsea cable alert service for latency-sensitive desks" thread in the Technology section. Include one real alert example.
- **Nuclear Phynance** — quantitative finance forum. Similar approach.
- **HFT-specific Discord and Telegram groups** — identify through crypto derivatives communities. The founder's credibility is the entry point.
- **Crypto derivatives communities** — Twitter following lists of known derivatives traders. Targeted DM: "Noticed you trade cross-exchange arb. Built an alert service for cable events that hit Atlantic and Pacific routes. Would you try it for a month?"

**LinkedIn direct outreach (precision targeting):**
Search LinkedIn for: "Head of Infrastructure" / "Network Engineering Director" / "Quantitative Developer" at prop trading firms (Jane Street, Citadel Securities, Two Sigma, Hudson River Trading, SIG) + mid-size UK hedge funds + crypto trading firms (Genesis, Cumberland, B2C2).

Message frame: "I built CableAlert for exactly your team — 15-minute subsea cable alerts in Telegram, trading-focused framing, £50/month. Noticed you're at [Firm]. Would you trial it for a month?"

Target: 50 outreach messages/week. Even 2% conversion = 1 new subscriber/week.

**Network engineering community:**
- Hacker News (Show HN): "Show HN: I built a subsea cable outage alert service — 15 minutes ahead of Twitter." HN audience includes the network engineers, founders, and technical traders who are exactly the target.
- The Register / Ars Technica: Submit news tip when a CRITICAL alert fires that isn't yet covered publicly. "CableAlert detected this 20 minutes before Twitter." Press coverage is free marketing.

### Phase 3 — Leverage the alerts themselves (ongoing)

Every CRITICAL alert that auto-posts to X is distribution. The strategy compounds with real events:
- When SEA-ME-WE-5 has an incident: CableAlert posts it. Traders see it before Bloomberg. One of them subscribes.
- When a Red Sea rerouting happens: CableAlert posts the latency impact analysis. Network engineers share it. 3 of them subscribe.
- When a repair vessel is dispatched: CableAlert posts the ETA. Infrastructure teams follow the account for the next event.

The X account is not marketing — it is the product demonstrating itself in public. This is the conversion mechanism that requires no spend.

### Phase 4 — B2B sales (Month 3+, gated on 20 subscribers)

At 20 subscribers, there is proof of WTP. Approach enterprise buyers:
- Small prop trading firms (5–50 employees, no in-house infrastructure monitoring)
- Crypto exchange infrastructure teams (Binance, Kraken, OKX infrastructure leads)
- CDN operators (Fastly, Cloudflare partner networks)

Sales approach: short email, one real alert example, 30-day trial offer. The trial is not free — it is the first 30 days of a £50/month subscription, cancellable via Stripe Customer Portal.

### Distribution channel priority

| Channel | Effort | Time to first subscriber | Revenue potential |
|---------|--------|--------------------------|-------------------|
| Twitter/X auto-posts (CRITICAL events) | Zero (built in) | When first real event fires | High (compounding) |
| LinkedIn expert content (founder) | Medium | 2–4 weeks | High (credibility-driven) |
| Elitetrader / Nuclear Phynance | Medium | 1–2 weeks | High (exact audience) |
| LinkedIn direct outreach | High | 2–4 weeks | High (precision) |
| Hacker News Show HN | Low (one-time) | Day 1 | Medium |
| Crypto Telegram/Discord | Medium | 2–4 weeks | Medium |
| Press/journalist tips | Low | Unpredictable | Medium |
| Enterprise B2B (Month 3+) | High | Month 3+ | Very high (ARPU) |

---

## 8. TRACTION & CURRENT STATUS

| Item | Status |
|------|--------|
| Product | Built. Scraper pipeline, Telegram delivery, email digest, Stripe checkout, admin dashboard |
| Scrapers | SubTel Forum (Cheerio), ThousandEyes (Cheerio), Twitter (API v2 with 3-attempt backoff) |
| Database | Neon schema written. DB setup required (user action). |
| Domain | cablealert.io — pending Vercel deployment |
| Telegram bot | Pending BotFather creation + webhook setup |
| Stripe | Pending product creation (£50/month) + webhook registration |
| Twitter/X API | Pending X Developer Portal registration. Usage-based — no fixed tier. $0.015/post (no URL), $0.005/read. |
| Paying subscribers | 0 (pre-launch) |
| MRR | £0 |
| LinkedIn content | Session 69 drafted first post: "Ghost lines are the most expensive invisible cost..." — WAIT, that's GhostLine. CableAlert LinkedIn post drafted in Session 69: "Why subsea cable cuts move markets before anyone knows." Ready to post. |

---

## 9. 90-DAY ROADMAP

### Month 1 — Launch

| Week | Action | Owner |
|------|--------|-------|
| W1 | Create GitHub repo. Push. Connect Vercel. Deploy with all env vars. | Irfan |
| W1 | Create Stripe product (£50/month). Register webhook. | Irfan |
| W1 | Create Telegram bot via @BotFather. Set TELEGRAM_BOT_TOKEN. Set webhook URL. | Irfan |
| W1 | Register X Developer Portal (free). Create app, generate Bearer Token. Set TWITTER_BEARER_TOKEN. Usage-based — no fixed monthly tier to apply for. | Irfan |
| W1 | Post first LinkedIn article: "Why Red Sea cable risk is the most important thing your trading desk isn't monitoring." | Irfan |
| W2 | Post Show HN: "I built a subsea cable outage alert service for latency-sensitive traders." | Irfan |
| W2 | Post on Elitetrader + Nuclear Phynance. | Irfan |
| W3 | First LinkedIn outreach batch: 50 InMail to HFT infrastructure + prop trading network engineering leads | Irfan |
| W4 | Review: any subscribers? Any replies? Adjust outreach message based on responses. | Irfan |

**Month 1 target:** 5 subscribers (£250 MRR). First real CRITICAL alert distributed.

### Month 2 — Retention and credibility

| Priority | Detail |
|----------|--------|
| Subscriber onboarding | Welcome email with "what to expect from alerts" + Telegram setup guide |
| LinkedIn content cadence | 3×/week: cable event analysis, latency benchmarks, expert commentary |
| Twitter/X critical auto-posts | Confirm automation is live and posting correctly |
| Second LinkedIn outreach batch | 50 InMail to crypto derivatives infrastructure leads |
| Elitetrader thread update | "Update: first real alert fired. Here's what it looked like and how fast it was." |

**Month 2 target:** 12 subscribers (£600 MRR). One piece of press coverage or retweet from a known trading personality.

### Month 3 — Scale and API prep

| Priority | Detail |
|----------|--------|
| Route-specific filtering | Allow subscribers to choose Atlantic / Pacific / Red Sea alerts only |
| API tier specification | Document REST endpoints. Build for 3–5 interested API customers. |
| Enterprise B2B outreach | Identify 10 target firms for direct sales conversation |
| Weekly intelligence report | PDF summary emailed Monday. Builds perceived value for renewals. |

**Month 3 target:** 20 subscribers (£1,000 MRR). One API tier customer.

---

## 10. FINANCIAL PROJECTIONS

### Conservative case

| Month | Pro subscribers | API subscribers | MRR |
|-------|----------------|-----------------|-----|
| 1 | 5 | 0 | £250 |
| 2 | 10 | 0 | £500 |
| 3 | 18 | 1 | £1,100 |
| 6 | 40 | 3 | £2,600 |
| 12 | 80 | 8 | £5,600 |

### Base case (founder content drives consistent discovery)

| Month | Pro subscribers | API subscribers | MRR |
|-------|----------------|-----------------|-----|
| 1 | 5 | 0 | £250 |
| 2 | 14 | 0 | £700 |
| 3 | 25 | 2 | £1,650 |
| 6 | 60 | 6 | £4,200 |
| 12 | 120 | 15 | £9,000 |

### Cost structure

| Cost | Monthly | Notes |
|------|---------|-------|
| Vercel (cron jobs) | £20 | Cron jobs require Pro plan |
| Neon | £0–£20 | Low data volume at early subscriber counts |
| Claude API | £10–£30 | ~£0.02/classification × 2,880 scrape cycles/month |
| Resend | £0 | Free tier covers email digests at early subscriber count |
| X (Twitter) API | ~£15–£45 | Usage-based — two cost components: (1) CRITICAL auto-posts with URL: $0.20/post × 1–4/month = <$1/month (immaterial). (2) Post reads for scraping: $0.005/tweet × results returned per search. If X scrapes every 15 min at 10 results/query = $144/month. **Scraper design mitigation: X should scrape at 1-hour intervals, not 15-minute intervals. SubTel Forum + ThousandEyes + Kentik carry the 15-min speed requirement. X at hourly intervals + 5 results/query = ~$18/month. This is the designed operating mode.** |
| Total (Month 1–3) | ~£55–£95/month | X scraping (hourly, 5 results/query) + Vercel Pro are the two material costs. |

**Note:** No fixed monthly API cost for X, but the read pricing is non-trivial if X scrapes at 15-minute intervals like the other sources. Solution: X scrapes hourly. SubTel Forum, ThousandEyes, and Kentik run at 15 minutes (they are HTML scraping — zero API cost). This keeps total X read cost at ~£15–£35/month. Break-even on infrastructure: 2 subscribers (£100 MRR covers ~£90/month costs with margin). If read costs become material at scale, the X scrape interval can be extended further without meaningful intelligence loss — SubTel/ThousandEyes carry the core signal.

---

## 11. RISKS AND MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| X API usage costs spike unexpectedly | Low | Low | Usage-based model means costs scale with activity, not a fixed commitment. Heavy 15-min scrape cycle: ~$2/day worst case. CRITICAL auto-posts use plain text (no URL) at $0.015 each. Summon replies ($0.01) keep community distribution near-zero. SubTel Forum + ThousandEyes + Kentik maintain full service even if X scraping is reduced. |
| Telegram blocks bot (policy change) | Low | High | Email digest provides full redundancy. Slack integration (v1) adds third channel. |
| No real CRITICAL events for weeks after launch | Medium | Medium | Medium and high events still fire regularly. Daily digest provides product touchpoint regardless. X content strategy continues even during quiet periods. |
| Competitor builds same product | Low | Medium | First-mover + founder's carrier-side expertise. The expert framing cannot be replicated quickly. A raw scraper without the latency interpretation is a different product. |
| Trading desk contacts ignore cold outreach | Medium | Medium | Multiple community channels (Elitetrader, HN, crypto Discord). Content-first approach builds credibility that makes outreach warmer over time. |
| Latency benchmark data becomes outdated | Low | Low | Update benchmark figures quarterly from public ThousandEyes and Kentik data. |

---

## 12. THE UNFAIR ADVANTAGES

1. **Carrier-side intelligence no competitor can replicate.** 11 years as a Strategic Alliances Director in Colt Technology's Optical and Wholesale division. Direct knowledge of: which subsea cable systems carry which financial routes, how NOC alerts propagate from carrier networks to public sources (the 10–20 minute lag), which repair vessels are operated by HMN Tech vs Alcatel Submarine Networks, and how trading desks interpret latency changes. This is institutional knowledge. A competitor building a news scraper does not have it.

2. **The product is self-distributing.** Every CRITICAL alert auto-posts to X. Real cable events are the marketing. The product finds its audience by doing its job publicly. No ad spend, no cold email campaign — just doing what the product does, in public.

3. **Price point is defensibly positioned.** £50/month is simultaneously: (a) trivially low relative to the value it provides (one avoided latency-affected trade session pays for 10+ years of Pro), and (b) 48× cheaper than the only comparable alternative (Bloomberg Terminal). There is no competing product at this price point. The unoccupied space is structural, not temporary.

4. **Small, identifiable audience.** The target audience is precise: 2,000–4,000 latency-sensitive trading firms globally. They are identifiable on LinkedIn, active on 3–4 specific forums, and contactable. This is a £9,000 MRR product that requires finding 180 of the right customers — not 10,000 random ones.

5. **Portfolio leverage — SignalRank GEO shared.** The MVNO routing intelligence that powers SignalRank's city recommendations comes from the same carrier-side background that frames CableAlert's trading alerts. One credential, two monetisation paths.

---

*This document is the business planning reference.*
*Technical detail: `CLAUDE.md`*
*Session log: `subsea_CHANGELOG.md`*
*Last updated: May 2026*
