import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { assignmentCreateSchema } from '@/lib/schemas';
import { assertOwnsPosition } from '@/lib/leadership';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');

    const body = assignmentCreateSchema.parse(await req.json());

    const { data: position } = await db.from('leadership_positions')
      .select('id, scope, local_id, title').eq('id', body.position_id).single();
    if (!position) throw new ApiError(404, 'Position not found');
    assertOwnsPosition(ctx, position);

    const { data: member } = await db.from('members').select('id, local_id').eq('id', body.member_id).single();
    if (!member) throw new ApiError(404, 'Member not found');
    if (position.scope !== 'national' && member.local_id !== ctx.localId) {
      throw new ApiError(403, 'Member must belong to your local');
    }

    const academic_year = body.academic_year ?? currentAcademicYear();

    const { data, error } = await db.from('leadership_assignments').insert({
      member_id: body.member_id, position_id: body.position_id, academic_year, assigned_by: ctx.userId,
    }).select('id').single();
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'This position already has a current holder — end their term first');
      throw new ApiError(500, error.message);
    }

    await db.from('member_history').insert({
      member_id: body.member_id, event_type: 'position_assigned',
      new_value: { position_id: position.id, title: position.title },
      changed_by: ctx.userId, academic_year,
    });

    await audit(ctx, 'leadership.assigned', 'leadership_assignment', data.id, { position_id: position.id, member_id: body.member_id });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
