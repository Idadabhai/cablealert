// app/api/cron/scrape/route.ts
// Vercel Cron: runs every 15 minutes
// Pipeline: scrapers → Claude classification → DB upsert → Telegram alerts → X post (critical only)
// MUST be idempotent — deduplication via source_url

import { NextRequest, NextResponse } from 'next/server';
import { scrapeSubtelForum }   from '@/lib/scrapers/subtelforum';
import { scrapeThousandEyes }  from '@/lib/scrapers/thousandeyes';
import { scrapeTwitter }       from '@/lib/scrapers/twitter';
import { classifyOutage }      from '@/lib/ai';
import { broadcastAlert }      from '@/lib/telegram';
import {
  getOutageEventBySourceUrl,
  insertOutageEvent,
  insertAlertDelivery,
  insertScrapeLog,
  getActiveSubscribers,
  markEventAlertSent,
} from '@/lib/db';
import type { ScrapedItem } from '@/types/db';

// Verify this is a Vercel Cron call or authorised manual trigger
function isAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron-signature'); // set by Vercel Cron
  const cronSecret = process.env.CRON_SECRET;

  if (cronHeader) return true; // Vercel Cron is always trusted
  if (authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runStarted = Date.now();
  const results = {
    processed: 0,
    new_events: 0,
    alerts_triggered: 0,
    errors: [] as string[],
  };

  // ── 1. Run all scrapers in parallel ──────────────────────

  const scraperResults = await Promise.allSettled([
    runScraper('SubtelForum', scrapeSubtelForum),
    runScraper('ThousandEyes', scrapeThousandEyes),
    runScraper('Twitter', scrapeTwitter),
  ]);

  const allItems: ScrapedItem[] = [];
  for (const result of scraperResults) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      await insertScrapeLog({
        source_name: result.value.source,
        status: result.value.error ? 'error' : 'success',
        items_found: result.value.items.length,
        items_new: 0, // updated below
        duration_ms: result.value.durationMs,
        error_message: result.value.error ?? null,
      });
    } else {
      results.errors.push(String(result.reason));
    }
  }

  // ── 2. Classify + deduplicate ─────────────────────────────

  const subscribers = await getActiveSubscribers();
  const newHighPriorityEvents = [];

  for (const item of allItems) {
    results.processed++;

    try {
      // Deduplication check
      const existing = await getOutageEventBySourceUrl(item.url);
      if (existing) continue; // Already processed

      // Classify with Claude
      const classification = await classifyOutage(
        `${item.headline}\n\n${item.bodyText}`,
        item.url
      );

      // Save event (including noise — we record everything for audit)
      const event = await insertOutageEvent({
        cable_name:                    classification.cable_name,
        affected_routes:               classification.affected_routes,
        severity:                      classification.severity,
        summary:                       classification.summary,
        raw_text:                      `${item.headline}\n\n${item.bodyText}`.slice(0, 1000),
        source_url:                    item.url,
        source_name:                   item.source,
        estimated_latency_impact_ms:   classification.estimated_latency_impact_ms,
        confidence:                    classification.confidence,
        x_post_url:                    null,
        alert_sent:                    false,
      });

      results.new_events++;

      // ── 3. Alert on critical/high events ─────────────────

      if (['critical', 'high'].includes(classification.severity) && subscribers.length > 0) {
        const { sent, failed } = await broadcastAlert(subscribers, event);
        results.alerts_triggered += sent;

        // Log deliveries
        for (const sub of subscribers) {
          if (!sub.telegram_chat_id) continue;
          await insertAlertDelivery({
            subscriber_id:      sub.id,
            event_id:           event.id,
            admin_alert_id:     null,
            channel:            'telegram',
            status:             'sent', // simplified — could track per-subscriber
            telegram_message_id: null,
            error_message:      null,
            is_digest:          false,
          }).catch(err => console.error('insertAlertDelivery error:', err));
        }

        // Track for X auto-post
        if (classification.severity === 'critical') {
          newHighPriorityEvents.push(event);
        }

        await markEventAlertSent(event.id);
      }
    } catch (err) {
      results.errors.push(`${item.url}: ${String(err)}`);
    }
  }

  // ── 4. Auto-post critical events to X ────────────────────
  // (X posting deferred to Session 7 — stub here)
  for (const event of newHighPriorityEvents) {
    console.log(`[cron] Critical event — X post queued: ${event.cable_name} (${event.id})`);
    // TODO Session 7: post to X via lib/twitter.ts
  }

  const durationMs = Date.now() - runStarted;
  console.log(`[cron/scrape] Done in ${durationMs}ms. New: ${results.new_events}, Alerts: ${results.alerts_triggered}`);

  return NextResponse.json({ ...results, duration_ms: durationMs });
}

// ── Scraper runner with error isolation ─────────────────────

async function runScraper(
  source: string,
  fn: () => Promise<ScrapedItem[]>
): Promise<{ source: string; items: ScrapedItem[]; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const items = await fn();
    return { source, items, durationMs: Date.now() - start };
  } catch (err) {
    return {
      source,
      items: [],
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
