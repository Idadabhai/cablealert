// lib/scrapers/twitter.ts
// Twitter/X API v2 search for subsea cable signals
// Requires Basic tier API access (~$100/month) — apply at developer.twitter.com
// Min retweets filter reduces noise significantly
// Rate limit: Twitter v2 Basic = 1 search request/15 min. On 429, exponential backoff.

import { TwitterApi } from 'twitter-api-v2';
import type { ScrapedItem } from '@/types/db';

const SOURCE_NAME = 'Twitter/X';
const SEARCH_QUERY = '"subsea cable" (cut OR fault OR outage OR repair OR severed OR damaged) -is:retweet lang:en';
const MIN_RETWEETS = 3;

// ── Rate-limit retry ────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000]; // 5s, 15s, 60s

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchWithRetry(
  roClient: ReturnType<TwitterApi['readOnly']['get']> extends never
    ? never
    : TwitterApi['readOnly'],
  query: string,
  options: Parameters<typeof roClient.v2.search>[1],
  attempt = 0
): ReturnType<typeof roClient.v2.search> {
  try {
    return await roClient.v2.search(query, options);
  } catch (err: unknown) {
    const apiError = err as { code?: number; data?: { status?: number } };
    const is429 =
      apiError?.code === 429 ||
      (apiError?.data as { status?: number } | undefined)?.status === 429;

    if (is429 && attempt < RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[attempt];
      console.warn(
        `[twitter] Rate limited (429). Attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}. ` +
        `Waiting ${delay / 1000}s before retry.`
      );
      await sleep(delay);
      return searchWithRetry(roClient, query, options, attempt + 1);
    }

    throw err;
  }
}

// ── Client ──────────────────────────────────────────────────────────────────

function getClient(): TwitterApi {
  // Support both OAuth 2.0 Bearer (read-only, simpler) and OAuth 1.0a (full access)
  if (process.env.TWITTER_BEARER_TOKEN) {
    return new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  }

  if (
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  ) {
    return new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  }

  throw new Error(
    'Twitter credentials not configured. Set TWITTER_BEARER_TOKEN (preferred) or ' +
    'TWITTER_API_KEY + TWITTER_API_SECRET + TWITTER_ACCESS_TOKEN + TWITTER_ACCESS_SECRET.'
  );
}

// ── Main scraper ────────────────────────────────────────────────────────────

export async function scrapeTwitter(): Promise<ScrapedItem[]> {
  const client = getClient();
  const roClient = client.readOnly;

  // Search last 16 minutes (matches 15-min cron cadence with 1-min buffer)
  const since = new Date(Date.now() - 16 * 60 * 1000);

  let response;
  try {
    response = await searchWithRetry(
      roClient,
      SEARCH_QUERY,
      {
        max_results: 20,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'text'],
        'user.fields': ['username'],
        expansions: ['author_id'],
        start_time: since.toISOString(),
      }
    );
  } catch (err: unknown) {
    const apiError = err as { code?: number; message?: string };
    // 429 exhausted — log and return empty (non-fatal: cron will retry in 15 min)
    if (apiError?.code === 429) {
      console.error('[twitter] Rate limit exhausted after retries. Skipping this cycle.');
      return [];
    }
    // Other API error — re-throw so the cron logs it properly
    throw err;
  }

  const items: ScrapedItem[] = [];
  if (!response.data?.data) return items;

  const usersMap = new Map(
    (response.data.includes?.users ?? []).map((u) => [u.id, u.username])
  );

  for (const tweet of response.data.data) {
    const retweets = tweet.public_metrics?.retweet_count ?? 0;
    if (retweets < MIN_RETWEETS) continue; // Filter low-signal noise

    const authorHandle = usersMap.get(tweet.author_id ?? '') ?? 'unknown';
    const tweetUrl = `https://twitter.com/${authorHandle}/status/${tweet.id}`;

    items.push({
      headline: tweet.text.slice(0, 200),
      url: tweetUrl,
      date: tweet.created_at ?? null,
      bodyText: tweet.text,
      source: SOURCE_NAME,
    });
  }

  return items;
}
