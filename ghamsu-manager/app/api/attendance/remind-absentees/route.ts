import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { resolveAudience, type AudienceFilter } from '@/lib/email-audience';
import { textToSimpleHtml } from '@/lib/email-template';
import { sendBlast } from '@/lib/email-send';
import { enforceRateLimit } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

const remindSchema = z.object({
  memberIds: z.array(z.number().int().positive()).min(1),
});

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const body = remindSchema.parse(await req.json());
    const localId = ctx.localId as number;

    const { data: local } = await db.from('locals').select('name').eq('id', localId).single();
    const localName = local?.name ?? 'your local';

    const subject = `We missed you at ${localName} this Sunday!`;
    const message = [
      'Hi there,',
      '',
      "We noticed you've missed the last few Sunday services and wanted to check in — we'd love to see you again soon.",
      "Let us know if everything's okay or if there's anything we can help with.",
      '',
      'God bless,',
      `${localName} Executives`,
    ].join('\n');

    const audienceFilter: AudienceFilter = { type: 'specific_members', ids: body.memberIds };
    const { recipients, skippedCount } = await resolveAudience({ national: false, localId }, audienceFilter);

    if (recipients.length === 0) {
      throw new ApiError(422, 'None of the selected members have an email on file — nothing to send.');
    }

    const isDirectSend = ctx.role === 'local_president';
    if (isDirectSend) enforceRateLimit(`email-send:${ctx.userId}`, 10, 60_000);

    const { data: blast, error } = await db.from('email_blasts').insert({
      local_id: localId,
      audience_filter: audienceFilter,
      subject,
      body_html: textToSimpleHtml(message),
      body_text: message,
      recipient_count: recipients.length,
      skipped_count: skippedCount,
      status: isDirectSend ? 'draft' : 'pending_approval',
      created_by: ctx.userId,
    }).select('id').single();
    if (error) throw new ApiError(500, error.message);

    if (isDirectSend) {
      const result = await sendBlast(blast.id);
      await audit(ctx, 'attendance.reminder_sent', 'email_blast', blast.id, result);
      return NextResponse.json(result);
    }

    await audit(ctx, 'attendance.reminder_drafted', 'email_blast', blast.id, { recipientCount: recipients.length });
    return NextResponse.json({ status: 'pending_approval', recipientCount: recipients.length, skippedCount });
  } catch (e) { return handleApiError(e); }
}
