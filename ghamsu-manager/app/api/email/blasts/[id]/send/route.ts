import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { sendBlast } from '@/lib/email-send';
import { audit } from '@/lib/audit';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');
    enforceRateLimit(`email-send:${ctx.userId}`, 10, 60_000);
    const id = Number((await params).id);

    const { data: blast } = await db.from('email_blasts').select('id, local_id, status, scheduled_at').eq('id', id).single();
    if (!blast) throw new ApiError(404, 'Blast not found');
    const inScope = ctx.role === 'national_president' ? blast.local_id === null : blast.local_id === ctx.localId;
    if (!inScope) throw new ApiError(403, 'Not permitted to send this blast');
    if (blast.status !== 'draft') throw new ApiError(409, 'Only a draft can be sent directly');

    if (blast.scheduled_at && new Date(blast.scheduled_at) > new Date()) {
      await db.from('email_blasts').update({ status: 'approved' }).eq('id', id);
      await audit(ctx, 'email.scheduled', 'email_blast', id, { scheduledAt: blast.scheduled_at });
      return NextResponse.json({ scheduled: true, scheduledAt: blast.scheduled_at });
    }

    const result = await sendBlast(id);
    await audit(ctx, 'email.sent', 'email_blast', id, result);
    return NextResponse.json({ sent: true, ...result });
  } catch (e) { return handleApiError(e); }
}
