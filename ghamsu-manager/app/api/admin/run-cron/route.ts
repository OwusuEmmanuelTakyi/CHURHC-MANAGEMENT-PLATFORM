import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { runBirthdays } from '@/lib/cron/birthdays';
import { runWeeklyAnalysis } from '@/lib/cron/weekly-analysis';
import { runEmailScheduler } from '@/lib/cron/email-scheduler';
import { audit } from '@/lib/audit';

const runCronSchema = z.object({
  task: z.enum(['birthdays', 'weekly_analysis', 'email_scheduler']),
});

// Lets the national president trigger any scheduled job on demand from an
// authenticated session — Hobby cron timing is imprecise, and this avoids ever
// putting CRON_SECRET in the browser to test something manually.
export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president');

    const { task } = runCronSchema.parse(await req.json());

    const result = await (task === 'birthdays' ? runBirthdays()
      : task === 'weekly_analysis' ? runWeeklyAnalysis()
      : runEmailScheduler());

    await audit(ctx, 'admin.cron_triggered', 'cron_task', task, result as unknown as Record<string, unknown>);
    return NextResponse.json({ task, result });
  } catch (e) {
    // Auth/permission failures go through the usual handler; a job failure
    // surfaces its real message instead of a generic 500 — this endpoint
    // exists specifically so you can see what went wrong when testing.
    if (e instanceof ApiError) return handleApiError(e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`admin/run-cron: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
