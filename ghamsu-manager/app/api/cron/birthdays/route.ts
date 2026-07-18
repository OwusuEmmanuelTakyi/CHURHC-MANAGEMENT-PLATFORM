import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/supabase/server';
import { isBirthdayToday } from '@/lib/birthdays';
import { renderBirthdayEmail } from '@/lib/email-template';

// Claims this member's birthday slot for the year BEFORE sending — if the
// insert fails (already claimed), a retry of this cron run can't double-send.
async function claimBirthdaySlot(memberId: number, year: number): Promise<boolean> {
  const { error } = await db.from('birthday_email_log').insert({ member_id: memberId, year });
  return !error;
}

// Exported separately from GET() so /api/cron/daily can also dispatch to it —
// Vercel Hobby caps cron jobs at 2, so this can't have its own schedule entry
// alongside email-scheduler and weekly-analysis. See app/api/cron/daily/route.ts.
export async function runBirthdaysJob() {
  const today = new Date();
  const year = today.getUTCFullYear();

  const { data: members, error } = await db.from('members')
    .select('id, full_name, email, local_id, date_of_birth')
    .is('deleted_at', null).not('date_of_birth', 'is', null);
  if (error) throw new Error(error.message);

  const todaysBirthdays = (members ?? []).filter((m) => isBirthdayToday(m.date_of_birth, today));
  const withEmail = todaysBirthdays.filter((m) => m.email);

  const localIds = Array.from(new Set(withEmail.map((m) => m.local_id)));
  const { data: locals } = localIds.length
    ? await db.from('locals').select('id, name').in('id', localIds)
    : { data: [] };
  const localNameMap = new Map((locals ?? []).map((l) => [l.id, l.name]));

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const results: { memberId: number; sent: boolean; reason?: string }[] = [];

  for (const m of withEmail) {
    const claimed = await claimBirthdaySlot(m.id, year);
    if (!claimed) {
      results.push({ memberId: m.id, sent: false, reason: 'already sent this year' });
      continue;
    }

    const localName = localNameMap.get(m.local_id) ?? 'GHAMSU';
    const firstName = m.full_name.trim().split(/\s+/)[0];
    const { html, text } = await renderBirthdayEmail({ firstName, localName });

    const { error: sendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: m.email as string,
      subject: `Happy birthday from ${localName}! 🎉`,
      html, text,
    });

    results.push({ memberId: m.id, sent: !sendError, reason: sendError?.message });
  }

  return {
    totalBirthdaysToday: todaysBirthdays.length,
    noEmailCount: todaysBirthdays.length - withEmail.length,
    processed: results.length,
    results,
  };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runBirthdaysJob();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
