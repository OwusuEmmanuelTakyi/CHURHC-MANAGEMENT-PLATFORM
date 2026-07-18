import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { sendBlast } from '@/lib/email-send';
import { audit } from '@/lib/audit';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president');
    enforceRateLimit(`email-send:${ctx.userId}`, 10, 60_000);
    const id = Number((await params).id);

    const { data: blast } = await db.from('email_blasts').select('id, local_id, status, scheduled_at').eq('id', id).single();
    if (!blast || blast.local_id !== ctx.localId) throw new ApiError(404, 'Blast not found');
    if (blast.status !== 'pending_approval') throw new ApiError(409, 'This blast is not pending approval');

    await db.from('email_blasts').update({ approved_by: ctx.userId }).eq('id', id);

    const scheduled = blast.scheduled_at && new Date(blast.scheduled_at) > new Date();
    if (scheduled) {
      await db.from('email_blasts').update({ status: 'approved' }).eq('id', id);
      await audit(ctx, 'email.approved_scheduled', 'email_blast', id, { scheduledAt: blast.scheduled_at });
      return NextResponse.json({ scheduled: true, scheduledAt: blast.scheduled_at });
    }

    const result = await sendBlast(id);
    await audit(ctx, 'email.approved_sent', 'email_blast', id, result);
    return NextResponse.json({ sent: true, ...result });
  } catch (e) { return handleApiError(e); }
}
