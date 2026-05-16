// lib/email.ts — Resend email for daily digest and subscriber notifications
// From: alerts@cablealert.io (verify this domain in Resend before sending)

import { Resend } from 'resend';
import type { Subscriber, OutageEvent } from '@/types/db';

// Lazy-init so the module can be imported at build time without a key present
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM = 'CableAlert <alerts@cablealert.io>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cablealert.io';

// ── Daily digest ────────────────────────────────────────────

export async function sendDailyDigest(
  subscriber: Subscriber,
  events: OutageEvent[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const dateStr = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const critical = events.filter(e => e.severity === 'critical');
    const high     = events.filter(e => e.severity === 'high');
    const medium   = events.filter(e => e.severity === 'medium');
    const resolved = events.filter(e => e.severity === 'resolved');

    const formatEvent = (e: OutageEvent) =>
      `Cable: ${e.cable_name ?? 'Unknown'} | Routes: ${e.affected_routes.join(', ')} | Impact: ${e.estimated_latency_impact_ms ? `+${e.estimated_latency_impact_ms}ms` : 'TBC'}
${e.summary}
Source: ${e.source_url}`;

    const sections: string[] = [];

    if (critical.length > 0) {
      sections.push(`${'━'.repeat(40)}\n🔴 CRITICAL (${critical.length})\n${'━'.repeat(40)}\n${critical.map(formatEvent).join('\n\n')}`);
    }
    if (high.length > 0) {
      sections.push(`${'━'.repeat(40)}\n🟠 HIGH (${high.length})\n${'━'.repeat(40)}\n${high.map(formatEvent).join('\n\n')}`);
    }
    if (medium.length > 0) {
      sections.push(`${'━'.repeat(40)}\n🟡 MEDIUM (${medium.length})\n${'━'.repeat(40)}\n${medium.map(formatEvent).join('\n\n')}`);
    }
    if (resolved.length > 0) {
      sections.push(`${'━'.repeat(40)}\n✅ RESOLVED (${resolved.length})\n${'━'.repeat(40)}\n${resolved.map(formatEvent).join('\n\n')}`);
    }

    const body = events.length === 0
      ? 'All quiet — no significant subsea cable events detected in the past 24 hours.'
      : sections.join('\n\n');

    const subject = events.length === 0
      ? `CableAlert Digest — ${dateStr} — All quiet`
      : `CableAlert Digest — ${dateStr} — ${events.length} event${events.length === 1 ? '' : 's'}`;

    const text = [
      'SUBSEA CABLE INTELLIGENCE DIGEST',
      `${dateStr} | CableAlert`,
      '',
      `${events.length} event${events.length === 1 ? '' : 's'} detected in the past 24 hours.`,
      '',
      body,
      '',
      '━'.repeat(40),
      `Manage subscription: ${APP_URL}/dashboard`,
      `Unsubscribe: ${APP_URL}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`,
      '',
      'CableAlert · Real-time subsea cable intelligence for latency-sensitive traders',
    ].join('\n');

    await getResend().emails.send({
      from: FROM,
      to: subscriber.email,
      subject,
      text,
    });

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error(`sendDailyDigest failed for ${subscriber.email}:`, error);
    return { success: false, error };
  }
}

// ── Welcome email (post-Stripe checkout) ───────────────────

export async function sendWelcomeEmail(email: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to CableAlert — set up your Telegram alerts',
      text: [
        'Welcome to CableAlert.',
        '',
        'You\'re now subscribed to real-time subsea cable outage intelligence.',
        '',
        'STEP 1: Connect Telegram',
        '─────────────────────',
        '1. Open Telegram and search for @CableAlertBot',
        '2. Send the bot /start',
        '3. Copy the Telegram ID the bot returns',
        '4. Paste it into your dashboard: ' + APP_URL + '/dashboard',
        '',
        'Once connected, you\'ll receive instant alerts when cables are cut or degraded — 15 minutes before Twitter.',
        '',
        'STEP 2: Configure your routes',
        '─────────────────────────────',
        'Visit your dashboard to filter alerts by route (London-NY, London-Singapore, etc.)',
        '',
        'Questions? Reply to this email.',
        '',
        '— CableAlert',
        APP_URL,
      ].join('\n'),
    });
  } catch (err) {
    console.error('sendWelcomeEmail failed (non-fatal):', err);
  }
}

// ── Critical outage instant alert ──────────────────────────

export async function sendCriticalAlert(
  subscriber: Subscriber,
  event: OutageEvent
): Promise<{ success: boolean }> {
  try {
    const routes = event.affected_routes.join(', ');
    const latency = event.estimated_latency_impact_ms
      ? `+${event.estimated_latency_impact_ms}ms`
      : 'TBC';

    await getResend().emails.send({
      from: FROM,
      to: subscriber.email,
      subject: `🔴 CRITICAL: ${event.cable_name ?? 'Subsea cable'} — ${routes}`,
      text: [
        '🔴 CRITICAL CABLE ALERT',
        '',
        `Cable: ${event.cable_name ?? 'Unknown'}`,
        `Routes affected: ${routes}`,
        `Latency impact: ${latency}`,
        '',
        event.summary,
        '',
        `Source: ${event.source_url}`,
        '',
        '─────────────────',
        'CableAlert · ' + APP_URL,
      ].join('\n'),
    });

    return { success: true };
  } catch (err) {
    console.error(`sendCriticalAlert failed for ${subscriber.email}:`, err);
    return { success: false };
  }
}
