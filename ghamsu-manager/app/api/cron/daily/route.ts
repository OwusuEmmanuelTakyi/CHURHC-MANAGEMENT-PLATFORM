import { NextResponse } from 'next/server';
import { runBirthdays, type BirthdaysResult } from '@/lib/cron/birthdays';
import { runWeeklyAnalysis, type WeeklyAnalysisResult } from '@/lib/cron/weekly-analysis';

// The one Vercel-scheduled cron on the Hobby plan (daily 06:00 UTC). Birthdays
// run every day; weekly-analysis only fires when today is Monday (UTC) — both
// fold into this single dispatcher because Hobby caps cron jobs at 2 and
// email-scheduler (sub-daily) already needs its own external ping, so this is
// the only slot left for anything Vercel itself triggers.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isMonday = new Date().getUTCDay() === 1;

  let birthdays: BirthdaysResult | { error: string };
  try {
    birthdays = await runBirthdays();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`cron/daily: birthdays task failed: ${message}`);
    birthdays = { error: message };
  }

  let weeklyAnalysis: WeeklyAnalysisResult | { error: string } | 'skipped (not Monday)';
  if (isMonday) {
    try {
      weeklyAnalysis = await runWeeklyAnalysis();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`cron/daily: weeklyAnalysis task failed: ${message}`);
      weeklyAnalysis = { error: message };
    }
  } else {
    weeklyAnalysis = 'skipped (not Monday)';
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    tasks: { birthdays, weeklyAnalysis },
  });
}
