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

const ATTENDANCE_RATE_LIMIT_PER_HOUR = 100;

function currentHourWindow(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

// Same basic per-IP hourly counter as lib/registration.ts's limiter, kept as
// its own copy against its own table (attendance_rate_limits) rather than
// shared, so a burst of self check-ins never eats into the registration
// form's much stricter budget or vice versa.
export async function checkAndIncrementAttendanceIpLimit(ip: string, limit = ATTENDANCE_RATE_LIMIT_PER_HOUR): Promise<boolean> {
  const windowHour = currentHourWindow();

  const { error: insertError } = await db.from('attendance_rate_limits')
    .insert({ ip, window_hour: windowHour, count: 1 });
  if (!insertError) return true;

  const { data: existing } = await db.from('attendance_rate_limits')
    .select('count').eq('ip', ip).eq('window_hour', windowHour).single();
  if (!existing || existing.count >= limit) return false;

  await db.from('attendance_rate_limits')
    .update({ count: existing.count + 1 }).eq('ip', ip).eq('window_hour', windowHour);
  return true;
}
