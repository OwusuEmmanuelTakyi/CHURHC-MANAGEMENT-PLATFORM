import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { audit } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'secretary');
    const id = Number((await params).id);

    const { data: blast } = await db.from('email_blasts').select('id, local_id, status').eq('id', id).single();
    if (!blast || blast.local_id !== ctx.localId) throw new ApiError(404, 'Blast not found');
    if (blast.status !== 'draft') throw new ApiError(409, 'Only drafts can be submitted for approval');

    const { error } = await db.from('email_blasts').update({ status: 'pending_approval' }).eq('id', id);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'email.submitted', 'email_blast', id);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
