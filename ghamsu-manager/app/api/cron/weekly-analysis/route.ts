import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/supabase/server';
import { computeLocalAttendanceAnalytics } from '@/lib/attendance-analytics';
import { hadBirthdayInPastWeek } from '@/lib/birthdays';
import { renderWeeklyAnalysisEmail } from '@/lib/email-template';
import { audit } from '@/lib/audit';

function lastSundayIso(now: Date): string {
  const dow = now.getUTCDay(); // 0 = Sunday
  const daysSince = dow === 0 ? 7 : dow;
  const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSince));
  return sunday.toISOString().slice(0, 10);
}

// Exported separately from GET() so /api/cron/daily can also dispatch to it —
// Vercel Hobby caps cron jobs at 2, so this can't have its own schedule entry
// alongside email-scheduler and birthdays. See app/api/cron/daily/route.ts.
export async function runWeeklyAnalysisJob() {
  const now = new Date();
  const sundayIso = lastSundayIso(now);
  const sundayDate = new Date(`${sundayIso}T00:00:00Z`);

  const { data: locals, error } = await db.from('locals').select('id, name').eq('active', true);
  if (error) throw new Error(error.message);

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const results: { localId: number; sent: boolean; recipients?: number; reason?: string }[] = [];

  for (const local of locals ?? []) {
    try {
      const { data: sundayService } = await db.from('services')
        .select('id, service_date').eq('local_id', local.id).eq('service_type', 'sunday_service')
        .eq('service_date', sundayIso).maybeSingle();

      const { data: roleAssignments } = await db.from('role_assignments')
        .select('id, user_id, role_type').eq('local_id', local.id).eq('active', true)
        .in('role_type', ['local_president', 'treasurer', 'secretary']);
      const userIds = Array.from(new Set((roleAssignments ?? []).map((r) => r.user_id)));
      const presidentAssignment = (roleAssignments ?? []).find((r) => r.role_type === 'local_president');

      const recipientEmails: string[] = [];
      for (const uid of userIds) {
        const { data: userResp } = await db.auth.admin.getUserById(uid);
        if (userResp?.user?.email) recipientEmails.push(userResp.user.email);
      }
      if (recipientEmails.length === 0) {
        results.push({ localId: local.id, sent: false, reason: 'no executive emails on file' });
        continue;
      }

      const { data: noEmailMembers } = await db.from('members')
        .select('date_of_birth').is('deleted_at', null).is('email', null)
        .not('date_of_birth', 'is', null).eq('local_id', local.id);
      const birthdaysNoEmailCount = (noEmailMembers ?? [])
        .filter((m) => hadBirthdayInPastWeek(m.date_of_birth, sundayDate)).length;

      let html: string;
      let text: string;
      let subject: string;

      if (!sundayService) {
        subject = `No attendance recorded for ${local.name} this Sunday`;
        ({ html, text } = await renderWeeklyAnalysisEmail({ localName: local.name, noServiceTaken: true }));
      } else {
        const analytics = await computeLocalAttendanceAnalytics(local.id);
        subject = `${local.name} — Sunday attendance report`;
        ({ html, text } = await renderWeeklyAnalysisEmail({
          localName: local.name,
          noServiceTaken: false,
          serviceDate: analytics.latestService?.service_date,
          presentCount: analytics.latestService?.presentCount ?? 0,
          previousCount: analytics.previousService?.presentCount ?? null,
          eligibleCount: analytics.eligibleCount,
          percentage: analytics.percentage,
          wingBreakdown: analytics.wingBreakdown,
          followUpList: analytics.followUpList,
          birthdaysNoEmailCount,
        }));
      }

      const { error: sendError } = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: recipientEmails,
        subject,
        html, text,
      });
      if (sendError) throw new Error(sendError.message);

      // Attributed to the local president's own executive record — the accountable
      // owner of this local's report — with metadata making clear it was automated.
      if (presidentAssignment) {
        await audit(
          { userId: presidentAssignment.user_id, role: 'local_president', localId: local.id, assignmentId: presidentAssignment.id },
          'attendance.weekly_analysis_sent', 'local', local.id,
          { automated: true, trigger: 'cron', serviceExisted: !!sundayService, recipientCount: recipientEmails.length },
        );
      }

      results.push({ localId: local.id, sent: true, recipients: recipientEmails.length });
    } catch (err) {
      results.push({ localId: local.id, sent: false, reason: err instanceof Error ? err.message : 'unknown error' });
    }
  }

  return { sundayDate: sundayIso, processed: results.length, results };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyAnalysisJob();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
