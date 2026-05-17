// lib/scrapers/twitter.ts
// Twitter/X API v2 search for subsea cable signals
// Requires Basic tier API access (~$100/month) — apply at developer.twitter.com
// Min retweets filter reduces noise significantly

import { TwitterApi } from 'twitter-api-v2';
import type { ScrapedItem } from '@/types/db';

const SOURCE_NAME = 'Twitter/X';
const SEARCH_QUERY = '"subsea cable" (cut OR fault OR outage OR repair OR severed OR damaged) -is:retweet lang:en';
const MIN_RETWEETS = 3;

function getClient(): TwitterApi {
  if (
    !process.env.TWITTER_API_KEY ||
    !process.env.TWITTER_API_SECRET ||
    !process.env.TWITTER_ACCESS_TOKEN ||
    !process.env.TWITTER_ACCESS_SECRET
  ) {
    throw new Error('Twitter API credentials not configured');
  }

  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });
}

export async function scrapeTwitter(): Promise<ScrapedItem[]> {
  const client = getClient();
  const roClient = client.readOnly;

  // Search last 15 minutes (matches cron cadence)
  const since = new Date(Date.now() - 16 * 60 * 1000); // 16 min buffer
  const sinceId = undefined; // Could store last seen ID for efficiency in v2

  const response = await roClient.v2.search(SEARCH_QUERY, {
    max_results: 20,
    'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'text'],
    'user.fields': ['username'],
    expansions: ['author_id'],
    start_time: since.toISOString(),
  });

  const items: ScrapedItem[] = [];

  if (!response.data?.data) return items;

  const usersMap = new Map(
    (response.data.includes?.users ?? []).map(u => [u.id, u.username])
  );

  for (const tweet of response.data.data) {
    const retweets = tweet.public_metrics?.retweet_count ?? 0;
    if (retweets < MIN_RETWEETS) continue; // Filter noise

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
