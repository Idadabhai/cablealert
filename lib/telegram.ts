// lib/telegram.ts — Telegram Bot API for subscriber push alerts
// Bot: @CableAlertBot (create via @BotFather, set TELEGRAM_BOT_TOKEN)
// Webhook URL: POST /api/webhooks/telegram

import type { OutageEvent, Subscriber } from '@/types/db';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getBotToken(): string {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return process.env.TELEGRAM_BOT_TOKEN;
}

// ── Severity emoji map ─────────────────────────────────────

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  high:     '🟠',
  medium:   '🟡',
  low:      '🔵',
  resolved: '✅',
  noise:    '⚪',
};

// ── Format alert message ───────────────────────────────────

function formatAlertMessage(event: OutageEvent): string {
  const emoji = SEVERITY_EMOJI[event.severity] ?? '📡';
  const severity = event.severity.toUpperCase();
  const routes = event.affected_routes.length > 0
    ? event.affected_routes.join(' | ')
    : 'Unknown';
  const latency = event.estimated_latency_impact_ms
    ? `+${event.estimated_latency_impact_ms}ms estimated`
    : 'Impact TBC';

  return [
    `${emoji} *${severity} CABLE ALERT*`,
    ``,
    `📡 *Cable:* ${event.cable_name ?? 'Unknown'}`,
    `🌐 *Routes:* ${routes}`,
    `⚡ *Latency impact:* ${latency}`,
    ``,
    `📋 ${event.summary}`,
    ``,
    `🔗 [Source](${event.source_url})`,
    `─────────────────`,
    `_CableAlert · cablealert.io_`,
  ].join('\n');
}

// ── Send alert to one subscriber ───────────────────────────

export async function sendAlert(
  chatId: string,
  event: OutageEvent
): Promise<{ success: boolean; telegram_message_id: string | null; error?: string }> {
  try {
    const message = formatAlertMessage(event);
    const res = await fetch(`${TELEGRAM_API}${getBotToken()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    const json = await res.json() as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!json.ok) {
      return {
        success: false,
        telegram_message_id: null,
        error: json.description ?? 'Telegram API error',
      };
    }

    return {
      success: true,
      telegram_message_id: String(json.result?.message_id ?? ''),
    };
  } catch (err) {
    return {
      success: false,
      telegram_message_id: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ── Broadcast to all active subscribers ───────────────────

export async function broadcastAlert(
  subscribers: Subscriber[],
  event: OutageEvent
): Promise<{ sent: number; failed: number }> {
  const telegramSubscribers = subscribers.filter(s => s.telegram_chat_id != null);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    telegramSubscribers.map(async (sub) => {
      const result = await sendAlert(sub.telegram_chat_id!, event);
      if (result.success) {
        sent++;
      } else {
        failed++;
        console.error(`Telegram delivery failed for ${sub.email}:`, result.error);
      }
    })
  );

  return { sent, failed };
}

// ── Send text message (for bot commands) ──────────────────

export async function sendTextMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}${getBotToken()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const json = await res.json() as { ok: boolean };
    return json.ok;
  } catch {
    return false;
  }
}

// ── Set webhook URL (run once after deploy) ────────────────

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  const res = await fetch(`${TELEGRAM_API}${getBotToken()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: process.env.TELEGRAM_BOT_SECRET,
    }),
  });
  const json = await res.json() as { ok: boolean };
  return json.ok;
}
