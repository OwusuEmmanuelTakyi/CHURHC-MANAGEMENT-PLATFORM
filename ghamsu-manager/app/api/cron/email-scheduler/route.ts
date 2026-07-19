import { NextResponse } from 'next/server';
import { runEmailScheduler } from '@/lib/cron/email-scheduler';

// Not scheduled by Vercel (Hobby only allows daily crons) — ping this
// externally every 15 minutes (e.g. cron-job.org) with the same
// `Authorization: Bearer ${CRON_SECRET}` header. See README "Scheduled jobs".
// Safe to call concurrently/repeatedly: runEmailScheduler() claims due blasts
// atomically before sending, so overlapping pings can't double-send.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runEmailScheduler();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`cron/email-scheduler: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
