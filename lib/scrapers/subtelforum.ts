// lib/scrapers/subtelforum.ts
// Scrapes SubTel Forum news feed for subsea cable incidents
// Method: Cheerio (static HTML — no JS required on this page)
// Deduplication: URL is used as unique key

import * as cheerio from 'cheerio';
import type { ScrapedItem } from '@/types/db';

const SOURCE_URL = 'https://subtelforum.com/news/';
const SOURCE_NAME = 'SubtelForum';
const MAX_BODY_CHARS = 800;

export async function scrapeSubtelForum(): Promise<ScrapedItem[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'CableAlert/1.0 (subsea cable intelligence service; contact@cablealert.io)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`SubtelForum fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  // SubtelForum uses WordPress — standard article.post structure
  $('article').each((_, el) => {
    const $el = $(el);
    const $link = $el.find('h2 a, h3 a').first();
    const headline = $link.text().trim();
    const url = $link.attr('href') ?? '';

    if (!headline || !url) return;

    // Skip non-cable content early (cheap filter before Claude call)
    const headlineLower = headline.toLowerCase();
    if (!isCableRelated(headlineLower)) return;

    const rawDate = $el.find('time').attr('datetime') ?? $el.find('time').text().trim() ?? null;
    const bodyText = $el.find('.entry-content p, .entry-summary p')
      .map((_, p) => $(p).text().trim())
      .get()
      .join(' ')
      .slice(0, MAX_BODY_CHARS);

    items.push({ headline, url, date: rawDate, bodyText, source: SOURCE_NAME });
  });

  return items;
}

// Quick keyword filter — saves Claude API calls on irrelevant news
function isCableRelated(text: string): boolean {
  const keywords = [
    'cable', 'outage', 'fault', 'cut', 'repair', 'severed', 'damaged',
    'disruption', 'restoration', 'maintenance', 'fiber', 'fibre',
    'seamewe', 'marea', 'hibernia', 'aeconnect', 'flag', 'jupiter',
    'faster', 'monet', 'tal', 'submarine', 'subsea', 'latency',
  ];
  return keywords.some(kw => text.includes(kw));
}
