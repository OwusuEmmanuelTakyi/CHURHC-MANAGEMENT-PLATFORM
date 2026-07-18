import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { serviceCreateSchema } from '@/lib/schemas';
import { ATTENDANCE_ELIGIBLE_STATUSES } from '@/lib/attendance';
import { audit } from '@/lib/audit';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');

    let q = db.from('services')
      .select('id, local_id, service_date, service_type, title, created_at')
      .order('service_date', { ascending: false });
    if (ctx.role !== 'national_president') q = q.eq('local_id', ctx.localId);

    const { data: services, error } = await q;
    if (error) throw new ApiError(500, error.message);

    const serviceIds = (services ?? []).map((s) => s.id);
    const { data: records } = serviceIds.length
      ? await db.from('attendance_records').select('service_id').in('service_id', serviceIds)
      : { data: [] };
    const presentCounts = new Map<number, number>();
    for (const r of records ?? []) presentCounts.set(r.service_id, (presentCounts.get(r.service_id) ?? 0) + 1);

    const localIds = Array.from(new Set((services ?? []).map((s) => s.local_id)));
    const { data: members } = localIds.length
      ? await db.from('members').select('local_id')
          .is('deleted_at', null).in('status', ATTENDANCE_ELIGIBLE_STATUSES).in('local_id', localIds)
      : { data: [] };
    const eligibleCounts = new Map<number, number>();
    for (const m of members ?? []) eligibleCounts.set(m.local_id, (eligibleCounts.get(m.local_id) ?? 0) + 1);

    const result = (services ?? []).map((s) => ({
      ...s,
      presentCount: presentCounts.get(s.id) ?? 0,
      eligibleCount: eligibleCounts.get(s.local_id) ?? 0,
    }));

    return NextResponse.json({ services: result });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const body = serviceCreateSchema.parse(await req.json());

    const { data, error } = await db.from('services').insert({
      local_id: ctx.localId,
      service_date: body.service_date ?? new Date().toISOString().slice(0, 10),
      service_type: body.service_type,
      title: body.title ?? null,
      created_by: ctx.userId,
    }).select('id').single();

    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'A service for this date and type already exists');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'service.created', 'service', data.id, { service_type: body.service_type });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
