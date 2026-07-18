import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, scopeQuery, handleApiError, ApiError } from '@/lib/rbac';
import { memberCreateSchema } from '@/lib/schemas';
import { normalizeGhPhone } from '@/lib/phone';
import { audit } from '@/lib/audit';
import { currentAcademicYear } from '@/lib/academic-year';

async function attachDuesStatus(members: { id: number }[]) {
  if (members.length === 0) return members.map((m) => ({ ...m, dues_paid: false }));
  const { data: paid } = await db.from('contributions')
    .select('member_id').eq('academic_year', currentAcademicYear())
    .in('member_id', members.map((m) => m.id));
  const paidSet = new Set((paid ?? []).map((p) => p.member_id));
  return members.map((m) => ({ ...m, dues_paid: paidSet.has(m.id) }));
}

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    const url = new URL(req.url);
    const after  = Number(url.searchParams.get('after') ?? 0);
    const limit  = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
    const status = url.searchParams.get('status');
    const wingId = url.searchParams.get('wing_id');
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('q');

    let q = db.from('members')
      .select('id, student_id, full_name, gender, phone, email, level, status, wing_id, class_id, local_id')
      .is('deleted_at', null)
      .gt('id', after)             // cursor: "give me rows after this id"
      .order('id')
      .limit(limit);

    q = scopeQuery(ctx, q);        // ← the RBAC wall, one line
    if (status) q = q.eq('status', status);
    if (wingId) q = q.eq('wing_id', Number(wingId));
    if (level) q = q.eq('level', Number(level));
    if (search) q = q.ilike('full_name', `%${search}%`);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    const members = ctx.role === 'treasurer' ? await attachDuesStatus(data) : data;

    return NextResponse.json({
      members,
      nextCursor: data.length === limit ? data[data.length - 1].id : null,
    });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const body = memberCreateSchema.parse(await req.json());

    const phone = normalizeGhPhone(body.phone);
    if (!phone) throw new ApiError(422, 'Invalid Ghanaian phone number');

    // local presidents/secretaries can only create in their own local
    if (body.local_id !== ctx.localId) throw new ApiError(403, 'Wrong local');

    const { data, error } = await db.from('members')
      .insert({ ...body, phone, created_by: ctx.userId })
      .select('id').single();

    if (error) {
      if (error.code === '23505')   // unique violation: phone or student_id
        throw new ApiError(409, 'A member with this phone or student ID already exists');
      throw new ApiError(500, error.message);
    }

    await db.from('member_history').insert({
      member_id: data.id, event_type: 'joined',
      new_value: { status: body.status, level: body.level },
      changed_by: ctx.userId, academic_year: currentAcademicYear(),
    });
    await audit(ctx, 'member.created', 'member', data.id);

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}