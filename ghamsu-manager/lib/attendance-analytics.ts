import { db } from './supabase/server';
import { ATTENDANCE_ELIGIBLE_STATUSES } from './attendance';

export interface SundayTrendPoint {
  service_date: string;
  presentCount: number;
}

export interface WingAttendanceBreakdown {
  wing_id: number | null;
  wing_name: string;
  presentCount: number;
  eligibleCount: number;
}

export interface FollowUpMember {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  wing_id: number | null;
}

export interface ServiceSnapshot {
  id: number;
  service_date: string;
  presentCount: number;
}

export interface LocalAttendanceAnalytics {
  localId: number;
  latestService: ServiceSnapshot | null;
  previousService: ServiceSnapshot | null;
  eligibleCount: number;
  percentage: number;
  trend: SundayTrendPoint[]; // oldest → newest, up to 8 points
  wingBreakdown: WingAttendanceBreakdown[];
  followUpList: FollowUpMember[];
  missedThreshold: number;
}

export async function computeLocalAttendanceAnalytics(
  localId: number, missedThreshold = 3,
): Promise<LocalAttendanceAnalytics> {
  const { data: sundayServices } = await db.from('services')
    .select('id, service_date').eq('local_id', localId).eq('service_type', 'sunday_service')
    .order('service_date', { ascending: false }).limit(8);

  const { data: eligibleMembers } = await db.from('members')
    .select('id, full_name, phone, email, wing_id').is('deleted_at', null)
    .in('status', ATTENDANCE_ELIGIBLE_STATUSES).eq('local_id', localId);
  const eligibleCount = eligibleMembers?.length ?? 0;

  const serviceIds = (sundayServices ?? []).map((s) => s.id);
  const { data: records } = serviceIds.length
    ? await db.from('attendance_records').select('service_id, member_id').in('service_id', serviceIds)
    : { data: [] };

  const presentByService = new Map<number, Set<number>>();
  for (const r of records ?? []) {
    if (!presentByService.has(r.service_id)) presentByService.set(r.service_id, new Set());
    presentByService.get(r.service_id)!.add(r.member_id);
  }

  const orderedDesc = sundayServices ?? [];
  const trend: SundayTrendPoint[] = orderedDesc.slice().reverse().map((s) => ({
    service_date: s.service_date,
    presentCount: presentByService.get(s.id)?.size ?? 0,
  }));

  const toSnapshot = (s: { id: number; service_date: string } | undefined): ServiceSnapshot | null =>
    s ? { id: s.id, service_date: s.service_date, presentCount: presentByService.get(s.id)?.size ?? 0 } : null;

  const latestService = toSnapshot(orderedDesc[0]);
  const previousService = toSnapshot(orderedDesc[1]);
  const latestPresentSet = latestService ? (presentByService.get(latestService.id) ?? new Set<number>()) : new Set<number>();

  const wingIds = Array.from(new Set(
    (eligibleMembers ?? []).map((m) => m.wing_id).filter((w): w is number => !!w),
  ));
  const { data: wings } = wingIds.length
    ? await db.from('wings').select('id, name').in('id', wingIds)
    : { data: [] };
  const wingNameMap = new Map((wings ?? []).map((w) => [w.id, w.name]));

  const wingEligible = new Map<number | null, number>();
  const wingPresent = new Map<number | null, number>();
  for (const m of eligibleMembers ?? []) {
    wingEligible.set(m.wing_id, (wingEligible.get(m.wing_id) ?? 0) + 1);
    if (latestPresentSet.has(m.id)) wingPresent.set(m.wing_id, (wingPresent.get(m.wing_id) ?? 0) + 1);
  }
  const wingBreakdown: WingAttendanceBreakdown[] = Array.from(wingEligible.entries()).map(([wingId, elig]) => ({
    wing_id: wingId,
    wing_name: wingId ? (wingNameMap.get(wingId) ?? 'Unknown') : 'No wing',
    presentCount: wingPresent.get(wingId) ?? 0,
    eligibleCount: elig,
  }));

  // Only meaningful once at least `missedThreshold` Sunday services exist —
  // otherwise there aren't enough weeks yet to say anyone missed all of them.
  const recentN = orderedDesc.slice(0, missedThreshold);
  let followUpList: FollowUpMember[] = [];
  if (recentN.length === missedThreshold) {
    followUpList = (eligibleMembers ?? [])
      .filter((m) => recentN.every((s) => !(presentByService.get(s.id) ?? new Set()).has(m.id)))
      .map((m) => ({ id: m.id, full_name: m.full_name, phone: m.phone, email: m.email, wing_id: m.wing_id }));
  }

  return {
    localId,
    latestService,
    previousService,
    eligibleCount,
    percentage: eligibleCount > 0 ? Math.round((latestPresentSet.size / eligibleCount) * 100) : 0,
    trend,
    wingBreakdown,
    followUpList,
    missedThreshold,
  };
}
