// app/api/webhooks/telegram/route.ts
// Receives Telegram Bot updates (user messages + commands)
// Set webhook URL via: POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={APP_URL}/api/webhooks/telegram

import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '@/lib/telegram';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from: { id: number; username?: string; first_name?: string };
    text?: string;
    date: number;
  };
}

export async function POST(req: NextRequest) {
  // Verify the secret token Telegram sends back (set when registering webhook)
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
  if (secretToken !== process.env.TELEGRAM_BOT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await req.json() as TelegramUpdate;
  const message = update.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text?.trim() ?? '';

  if (text === '/start' || text.startsWith('/start ')) {
    const firstName = message.from.first_name ?? 'there';

    await sendTextMessage(
      chatId,
      `👋 Hello ${firstName}! Welcome to CableAlert.\n\n` +
      `Your Telegram ID is: *${chatId}*\n\n` +
      `Copy this ID and paste it into your CableAlert dashboard at cablealert.io/dashboard to activate real-time alerts.\n\n` +
      `You'll receive alerts when:\n` +
      `• Subsea cables are cut or damaged\n` +
      `• Major route degradations occur\n` +
      `• Latency spikes above threshold on trading routes\n\n` +
      `Dashboard: cablealert.io/dashboard`
    );
  } else if (text === '/stop') {
    await sendTextMessage(
      chatId,
      `Alerts paused. To re-enable, visit cablealert.io/dashboard and reconnect Telegram.`
    );
    // TODO: update subscriber record to clear telegram_chat_id
  } else if (text === '/status') {
    await sendTextMessage(
      chatId,
      `✅ CableAlert bot is active.\n\nYour Telegram ID: ${chatId}\n\nMonitoring: London↔NY, London↔Singapore, London↔Tokyo, NYC↔São Paulo\n\nAny questions? Email contact@cablealert.io`
    );
  } else {
    await sendTextMessage(
      chatId,
      `Commands:\n/start — get your Telegram ID to connect to dashboard\n/status — check your alert status\n/stop — pause alerts`
    );
  }

  return NextResponse.json({ ok: true });
}
