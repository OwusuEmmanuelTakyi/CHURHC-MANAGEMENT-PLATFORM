import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { audit } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);

    const { data: reg } = await db.from('member_registrations').select('id, local_id, status').eq('id', id).single();
    if (!reg || reg.local_id !== ctx.localId) throw new ApiError(404, 'Registration not found');
    if (reg.status !== 'pending') throw new ApiError(409, 'This registration has already been reviewed');

    const { error } = await db.from('member_registrations').update({
      status: 'rejected', reviewed_by: ctx.userId, reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'registration.rejected', 'member_registration', id);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
