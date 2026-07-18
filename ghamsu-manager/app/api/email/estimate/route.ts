import { NextResponse } from 'next/server';
import { getScopedContext, requireRole, handleApiError } from '@/lib/rbac';
import { audienceFilterSchema } from '@/lib/schemas';
import { resolveAudience } from '@/lib/email-audience';

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');

    const body = await req.json();
    const audienceFilter = audienceFilterSchema.parse(body.audienceFilter);

    const scope = { national: ctx.role === 'national_president', localId: ctx.localId };
    const { recipients, skippedCount } = await resolveAudience(scope, audienceFilter);

    return NextResponse.json({ recipientCount: recipients.length, skippedCount });
  } catch (e) { return handleApiError(e); }
}
