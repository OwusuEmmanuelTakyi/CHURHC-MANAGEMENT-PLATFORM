import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { sendBlast } from '@/lib/email-send';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: due, error } = await db.from('email_blasts')
    .select('id').eq('status', 'approved').lte('scheduled_at', new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: number; ok: boolean; error?: string }[] = [];
  for (const blast of due ?? []) {
    try {
      await sendBlast(blast.id);
      results.push({ id: blast.id, ok: true });
    } catch (err) {
      await db.from('email_blasts').update({ status: 'failed' }).eq('id', blast.id);
      results.push({ id: blast.id, ok: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
