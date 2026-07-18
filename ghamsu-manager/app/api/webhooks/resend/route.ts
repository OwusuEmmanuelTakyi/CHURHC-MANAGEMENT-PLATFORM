import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/supabase/server';

const STATUS_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

interface ResendWebhookEvent {
  type: string;
  data: { email_id: string };
}

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  };

  let event: ResendWebhookEvent;
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
    event = wh.verify(payload, headers) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const status = STATUS_MAP[event.type];
  if (status) {
    await db.from('email_delivery_reports')
      .update({ status })
      .eq('provider_message_id', event.data.email_id);
  }

  return NextResponse.json({ ok: true });
}
