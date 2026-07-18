import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, handleApiError, type Role } from '@/lib/rbac';

const PERMISSIONS: Record<Role, string[]> = {
  national_president: ['members.view', 'leadership.admin', 'email.send', 'contributions.view', 'documents.view', 'audit.view', 'locals.view', 'locals.manage', 'attendance.view', 'graduation.view', 'executives.manage'],
  local_president:    ['members.view', 'members.edit', 'members.import', 'members.export', 'leadership.admin', 'email.send', 'email.approve', 'contributions.view', 'documents.view', 'documents.approve', 'audit.view', 'locals.view', 'wings.manage', 'attendance.view', 'attendance.take', 'registration.manage', 'graduation.view', 'executives.manage'],
  treasurer:          ['members.view', 'contributions.view', 'contributions.record', 'contributions.export', 'locals.view'],
  secretary:          ['members.view', 'members.edit', 'members.import', 'members.export', 'email.draft', 'documents.view', 'documents.manage', 'locals.view', 'attendance.view', 'attendance.take', 'registration.manage', 'leadership.view'],
};

export async function GET() {
  try {
    const ctx = await getScopedContext();

    const [{ data: profile }, { data: roles }] = await Promise.all([
      db.from('executives').select('id, name, phone').eq('id', ctx.userId).single(),
      db.from('role_assignments')
        .select('id, role_type, local_id, academic_year, locals(name, short_code)')
        .eq('user_id', ctx.userId).eq('active', true),
    ]);

    return NextResponse.json({
      profile,
      roles,
      activeRole: { id: ctx.assignmentId, role: ctx.role, localId: ctx.localId },
      permissions: PERMISSIONS[ctx.role],
    });
  } catch (e) { return handleApiError(e); }
}