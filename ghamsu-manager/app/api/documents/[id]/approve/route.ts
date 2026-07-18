import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { audit } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president');
    const id = Number((await params).id);

    const { data: doc } = await db.from('documents').select('id, local_id, status').eq('id', id).single();
    if (!doc || doc.local_id !== ctx.localId) throw new ApiError(404, 'Document not found');
    if (doc.status !== 'pending') throw new ApiError(409, 'This document has already been approved');

    const { error } = await db.from('documents')
      .update({ status: 'approved', approved_by: ctx.userId }).eq('id', id);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'document.approved', 'document', id);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
