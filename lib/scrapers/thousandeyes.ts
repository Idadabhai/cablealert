// lib/scrapers/thousandeyes.ts
// Scrapes ThousandEyes internet outage page for network disruptions
// Method: Cheerio. ThousandEyes page may require JS — fallback gracefully.

import * as cheerio from 'cheerio';
import type { ScrapedItem } from '@/types/db';

const SOURCE_URL = 'https://www.thousandeyes.com/outages/';
const SOURCE_NAME = 'ThousandEyes';
const MAX_BODY_CHARS = 600;

export async function scrapeThousandEyes(): Promise<ScrapedItem[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'CableAlert/1.0 (subsea cable intelligence service; contact@cablealert.io)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`ThousandEyes fetch failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  // ThousandEyes uses React — some content may not render in static HTML.
  // We try several selectors and fall back gracefully.
  const selectors = [
    'article',
    '[class*="outage"]',
    '[class*="incident"]',
    '[class*="alert"]',
    'div.event',
    'li.event-item',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const headline = $el.find('h2, h3, h4, [class*="title"]').first().text().trim();
      const linkEl = $el.find('a').first();
      const href = linkEl.attr('href') ?? '';
      const url = href.startsWith('http') ? href : `${SOURCE_URL}${href}`;
      const bodyText = $el.find('p, [class*="description"], [class*="summary"]')
        .first()
        .text()
        .trim()
        .slice(0, MAX_BODY_CHARS);
      const rawDate = $el.find('time').attr('datetime') ?? $el.find('time').text().trim() ?? null;

      if (!headline || headline.length < 10) return;

      // Only include if it looks cable/network related
      const combined = (headline + ' ' + bodyText).toLowerCase();
      if (!isNetworkRelated(combined)) return;

      const dedupeUrl = url || `${SOURCE_URL}#${headline.slice(0, 50).replace(/\s/g, '-')}`;

      items.push({ headline, url: dedupeUrl, date: rawDate, bodyText, source: SOURCE_NAME });
    });

    if (items.length > 0) break; // Found items with this selector — stop trying others
  }

  return items;
}

function isNetworkRelated(text: string): boolean {
  const keywords = [
    'cable', 'outage', 'disruption', 'connectivity', 'latency', 'fiber', 'fibre',
    'network', 'isp', 'backbone', 'peering', 'route', 'submarine', 'subsea',
    'atlantic', 'pacific', 'mediterranean', 'red sea',
  ];
  return keywords.some(kw => text.includes(kw));
}
