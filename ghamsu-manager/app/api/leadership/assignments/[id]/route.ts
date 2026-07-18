import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { assertOwnsPosition } from '@/lib/leadership';
import { audit } from '@/lib/audit';

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');
    const id = Number((await params).id);

    const { data: assignment } = await db.from('leadership_assignments')
      .select('id, member_id, end_date, leadership_positions(scope, local_id)')
      .eq('id', id).single();
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    if (assignment.end_date) throw new ApiError(409, 'This term has already ended');

    const position = assignment.leadership_positions as unknown as { scope: string; local_id: number | null };
    assertOwnsPosition(ctx, position);

    const { error } = await db.from('leadership_assignments')
      .update({ end_date: new Date().toISOString().slice(0, 10) }).eq('id', id);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'leadership.ended', 'leadership_assignment', id, { member_id: assignment.member_id });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
