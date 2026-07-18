import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { ATTENDANCE_ELIGIBLE_STATUSES } from '@/lib/attendance';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president');

    const { data: locals, error } = await db.from('locals').select('id, name').eq('active', true).order('name');
    if (error) throw new ApiError(500, error.message);

    const rows = [];
    for (const local of locals ?? []) {
      const { data: latestService } = await db.from('services')
        .select('id, service_date').eq('local_id', local.id).eq('service_type', 'sunday_service')
        .order('service_date', { ascending: false }).limit(1).maybeSingle();

      const { count: eligibleCount } = await db.from('members')
        .select('id', { count: 'exact', head: true }).is('deleted_at', null)
        .in('status', ATTENDANCE_ELIGIBLE_STATUSES).eq('local_id', local.id);

      let presentCount = 0;
      if (latestService) {
        const { count } = await db.from('attendance_records')
          .select('id', { count: 'exact', head: true }).eq('service_id', latestService.id);
        presentCount = count ?? 0;
      }

      rows.push({
        local_id: local.id,
        local_name: local.name,
        latestServiceDate: latestService?.service_date ?? null,
        presentCount,
        eligibleCount: eligibleCount ?? 0,
        percentage: eligibleCount ? Math.round((presentCount / eligibleCount) * 100) : 0,
      });
    }

    return NextResponse.json({ locals: rows });
  } catch (e) { return handleApiError(e); }
}
