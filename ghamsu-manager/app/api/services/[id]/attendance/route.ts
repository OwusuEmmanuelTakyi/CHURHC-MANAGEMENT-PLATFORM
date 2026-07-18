import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { attendanceToggleSchema } from '@/lib/schemas';
import { ATTENDANCE_ELIGIBLE_STATUSES, auditAttendanceSession } from '@/lib/attendance';

async function loadService(id: number) {
  const { data } = await db.from('services').select('id, local_id').eq('id', id).single();
  if (!data) throw new ApiError(404, 'Service not found');
  return data;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');
    const id = Number((await params).id);

    const service = await loadService(id);
    if (ctx.role !== 'national_president' && service.local_id !== ctx.localId) {
      throw new ApiError(403, 'Not permitted to view this service');
    }

    const [{ data: members, error: mErr }, { data: records, error: rErr }, { data: wings }] = await Promise.all([
      db.from('members').select('id, full_name, student_id, wing_id, level')
        .is('deleted_at', null).in('status', ATTENDANCE_ELIGIBLE_STATUSES).eq('local_id', service.local_id)
        .order('full_name'),
      db.from('attendance_records').select('member_id').eq('service_id', id),
      db.from('wings').select('id, name, local_id').eq('local_id', service.local_id).order('name'),
    ]);
    if (mErr) throw new ApiError(500, mErr.message);
    if (rErr) throw new ApiError(500, rErr.message);

    const presentSet = new Set((records ?? []).map((r) => r.member_id));
    const attendanceMembers = (members ?? []).map((m) => ({ ...m, present: presentSet.has(m.id) }));

    return NextResponse.json({
      members: attendanceMembers,
      wings: wings ?? [],
      presentCount: presentSet.size,
      totalCount: attendanceMembers.length,
    });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);

    const service = await loadService(id);
    if (service.local_id !== ctx.localId) throw new ApiError(403, 'Not permitted to take attendance for this service');

    const body = attendanceToggleSchema.parse(await req.json());

    const { data: member } = await db.from('members').select('id, local_id').eq('id', body.member_id).single();
    if (!member || member.local_id !== ctx.localId) throw new ApiError(404, 'Member not found');

    if (body.present) {
      const { error } = await db.from('attendance_records').insert({
        service_id: id, member_id: body.member_id, recorded_by: ctx.userId,
      });
      if (error && error.code !== '23505') throw new ApiError(500, error.message);
    } else {
      const { error } = await db.from('attendance_records').delete()
        .eq('service_id', id).eq('member_id', body.member_id);
      if (error) throw new ApiError(500, error.message);
    }

    await auditAttendanceSession(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
