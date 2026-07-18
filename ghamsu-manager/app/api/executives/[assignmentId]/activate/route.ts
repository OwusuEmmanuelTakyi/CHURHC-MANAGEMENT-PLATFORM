import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { assertCanManageAssignment, generateTempPassword } from '@/lib/executives';
import { audit } from '@/lib/audit';

export async function PATCH(_: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');
    const id = Number((await params).assignmentId);

    const { data: assignment } = await db.from('role_assignments')
      .select('id, user_id, role_type, local_id, active').eq('id', id).single();
    if (!assignment) throw new ApiError(404, 'Executive not found');
    if (assignment.active) throw new ApiError(409, 'This account is already active');

    assertCanManageAssignment(ctx, assignment);

    const { error: updateErr } = await db.from('role_assignments').update({ active: true }).eq('id', id);
    if (updateErr) {
      if (updateErr.code === '23505') throw new ApiError(409, 'This executive already holds an active assignment for this role');
      throw new ApiError(500, updateErr.message);
    }

    // A fresh credential on every reactivation — don't rely on whatever
    // password was set (or shared, or forgotten) the last time around.
    const tempPassword = generateTempPassword();
    const { error: pwErr } = await db.auth.admin.updateUserById(assignment.user_id, { password: tempPassword });
    if (pwErr) throw new ApiError(500, `Reactivated, but couldn't reset the password: ${pwErr.message}`);

    await audit(ctx, 'executive.activated', 'role_assignment', id);
    return NextResponse.json({ ok: true, tempPassword });
  } catch (e) { return handleApiError(e); }
}
