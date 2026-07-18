import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');
    const id = Number((await params).id);

    const { data: blast } = await db.from('email_blasts').select('*').eq('id', id).single();
    if (!blast) throw new ApiError(404, 'Blast not found');
    if (ctx.role !== 'national_president' && blast.local_id !== ctx.localId) {
      throw new ApiError(403, 'Not permitted to view this blast');
    }

    const { data: deliveries } = await db.from('email_delivery_reports').select('status').eq('blast_id', id);
    const report: Record<string, number> = {};
    for (const d of deliveries ?? []) report[d.status] = (report[d.status] ?? 0) + 1;

    return NextResponse.json({ blast, report });
  } catch (e) { return handleApiError(e); }
}
