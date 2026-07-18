import { db } from './supabase/server';
import { audit } from './audit';
import type { Ctx } from './rbac';

// Broader than dues eligibility (lib/contributions.ts) on purpose: prospective
// members — visitors and newcomers — are exactly who you want to track
// attendance for, to see if they're becoming regulars. Associates
// (alumni/honorary) aren't expected to attend, so they're excluded.
export const ATTENDANCE_ELIGIBLE_STATUSES = ['prospective', 'active', 'executive'] as const;

const AUDIT_COALESCE_WINDOW_MS = 60_000;

// Taps happen in rapid bursts at the chapel door — one audit row per session
// (per minute of activity) is enough, not one per tap.
export async function auditAttendanceSession(ctx: Ctx, serviceId: number) {
  const { data: recent } = await db.from('audit_logs')
    .select('created_at')
    .eq('entity_type', 'service').eq('entity_id', String(serviceId))
    .eq('action', 'attendance.updated').eq('user_id', ctx.userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < AUDIT_COALESCE_WINDOW_MS) {
    return;
  }

  const { count } = await db.from('attendance_records')
    .select('id', { count: 'exact', head: true }).eq('service_id', serviceId);

  await audit(ctx, 'attendance.updated', 'service', serviceId, { presentCount: count ?? 0 });
}
