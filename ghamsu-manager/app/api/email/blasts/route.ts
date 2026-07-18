import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { blastCreateSchema } from '@/lib/schemas';
import { resolveAudience } from '@/lib/email-audience';
import { textToSimpleHtml } from '@/lib/email-template';
import { audit } from '@/lib/audit';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');

    let q = db.from('email_blasts')
      .select('id, local_id, subject, status, recipient_count, skipped_count, scheduled_at, sent_at, created_at')
      .order('created_at', { ascending: false });
    if (ctx.role !== 'national_president') q = q.eq('local_id', ctx.localId);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ blasts: data });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');

    const body = blastCreateSchema.parse(await req.json());

    const scope = { national: ctx.role === 'national_president', localId: ctx.localId };
    const { recipients, skippedCount } = await resolveAudience(scope, body.audienceFilter);

    const { data, error } = await db.from('email_blasts').insert({
      local_id: ctx.role === 'national_president' ? null : ctx.localId,
      audience_filter: body.audienceFilter,
      subject: body.subject,
      body_html: textToSimpleHtml(body.body),
      body_text: body.body,
      recipient_count: recipients.length,
      skipped_count: skippedCount,
      status: 'draft',
      scheduled_at: body.scheduledAt ?? null,
      created_by: ctx.userId,
    }).select('id').single();
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'email.drafted', 'email_blast', data.id, { recipientCount: recipients.length });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
