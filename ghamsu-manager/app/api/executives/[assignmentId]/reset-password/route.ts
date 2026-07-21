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
    if (!assignment.active) throw new ApiError(409, 'This account is deactivated — reactivate it instead, which also issues a fresh password');

    assertCanManageAssignment(ctx, assignment);

    const tempPassword = generateTempPassword();
    const { error } = await db.auth.admin.updateUserById(assignment.user_id, { password: tempPassword });
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'executive.password_reset', 'role_assignment', id);
    return NextResponse.json({ ok: true, tempPassword });
  } catch (e) { return handleApiError(e); }
}
