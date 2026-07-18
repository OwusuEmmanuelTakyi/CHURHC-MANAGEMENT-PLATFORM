import { NextResponse } from 'next/server';
import { runBirthdaysJob } from '../birthdays/route';
import { runWeeklyAnalysisJob } from '../weekly-analysis/route';

// Vercel Hobby caps cron jobs at 2 (email-scheduler needs its own hourly
// schedule). Birthdays (daily 06:00 UTC) and weekly-analysis (Mondays 07:00
// UTC) both fold into this one daily 06:00 UTC entry instead — birthdays run
// every day, weekly-analysis only dispatches when today is Monday (UTC).
// /api/cron/birthdays and /api/cron/weekly-analysis still exist standalone
// for manual testing; this is just the one Vercel actually schedules.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isMonday = new Date().getUTCDay() === 1;

  try {
    const birthdays = await runBirthdaysJob();
    const weeklyAnalysis = isMonday ? await runWeeklyAnalysisJob() : null;
    return NextResponse.json({ birthdays, weeklyAnalysis, ranWeeklyAnalysis: isMonday });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
