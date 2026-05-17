// app/api/cron/digest/route.ts
// Vercel Cron: runs daily at 7am UTC
// Sends daily digest email to all active subscribers

import { NextRequest, NextResponse } from 'next/server';
import { getActiveSubscribers, getOutageEventsSince, insertAlertDelivery } from '@/lib/db';
import { sendDailyDigest } from '@/lib/email';

function isAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron-signature');
  if (cronHeader) return true;
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [subscribers, events] = await Promise.all([
    getActiveSubscribers(),
    getOutageEventsSince(since),
  ]);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const subscriber of subscribers) {
    const result = await sendDailyDigest(subscriber, events);

    await insertAlertDelivery({
      subscriber_id:      subscriber.id,
      event_id:           null,
      admin_alert_id:     null,
      channel:            'email',
      status:             result.success ? 'sent' : 'failed',
      telegram_message_id: null,
      error_message:      result.error ?? null,
      is_digest:          true,
    }).catch(err => console.error('insertAlertDelivery error:', err));

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(`${subscriber.email}: ${result.error}`);
    }
  }

  return NextResponse.json({
    sent,
    failed,
    events_in_digest: events.length,
    errors: errors.slice(0, 10),
  });
}
