import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { registrationReviewSchema } from '@/lib/schemas';
import { buildHistoryRows } from '@/lib/member-history';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);

    const { data: reg } = await db.from('member_registrations').select('*').eq('id', id).single();
    if (!reg || reg.local_id !== ctx.localId) throw new ApiError(404, 'Registration not found');
    if (reg.status !== 'pending') throw new ApiError(409, 'This registration has already been reviewed');

    const body = registrationReviewSchema.parse(await req.json().catch(() => ({})));

    if (reg.matched_member_id && body.mode !== 'merge') {
      throw new ApiError(409, 'This phone matches an existing member — choose "update existing member" or reject.');
    }
    if (!reg.matched_member_id && body.mode === 'merge') {
      throw new ApiError(422, 'No matched member to merge into');
    }

    let memberId: number;

    if (body.mode === 'merge') {
      memberId = reg.matched_member_id as number;
      const { data: old } = await db.from('members').select('*').eq('id', memberId).single();
      if (!old) throw new ApiError(404, 'Matched member no longer exists');

      const updates = {
        full_name: reg.full_name, email: reg.email, hall_of_residence: reg.hall_of_residence,
        wing_id: reg.wing_id, class_id: reg.class_id, level: reg.level,
        expected_graduation: reg.expected_graduation, date_of_birth: reg.date_of_birth,
      };
      const { error } = await db.from('members').update(updates).eq('id', memberId);
      if (error) throw new ApiError(500, error.message);

      const historyRows = buildHistoryRows(old, updates, memberId, ctx.userId);
      if (historyRows.length) await db.from('member_history').insert(historyRows);
    } else {
      const { data: created, error } = await db.from('members').insert({
        student_id: reg.student_id, full_name: reg.full_name, gender: reg.gender, phone: reg.phone,
        email: reg.email, hall_of_residence: reg.hall_of_residence, local_id: reg.local_id,
        wing_id: reg.wing_id, class_id: reg.class_id, level: reg.level, status: 'active',
        expected_graduation: reg.expected_graduation, date_of_birth: reg.date_of_birth,
        created_by: ctx.userId,
      }).select('id').single();
      if (error) {
        if (error.code === '23505') throw new ApiError(409, 'A member with this phone or student ID already exists');
        throw new ApiError(500, error.message);
      }
      memberId = created.id;

      await db.from('member_history').insert({
        member_id: memberId, event_type: 'joined',
        new_value: { status: 'active', level: reg.level },
        changed_by: ctx.userId, academic_year: currentAcademicYear(),
      });
    }

    await db.from('member_registrations').update({
      status: 'approved', reviewed_by: ctx.userId, reviewed_at: new Date().toISOString(),
      created_member_id: memberId,
    }).eq('id', id);

    await audit(ctx, 'registration.approved', 'member_registration', id, { mode: body.mode, member_id: memberId });
    return NextResponse.json({ ok: true, memberId });
  } catch (e) { return handleApiError(e); }
}
