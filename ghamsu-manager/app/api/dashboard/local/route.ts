import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { currentAcademicYear } from '@/lib/academic-year';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president');
    const localId = ctx.localId as number;

    const [
      { data: members, error: mErr },
      { data: wings },
      { data: classes },
      { data: roleAssignments },
      { data: positions },
    ] = await Promise.all([
      db.from('members').select('id, status, wing_id, class_id, expected_graduation')
        .is('deleted_at', null).eq('local_id', localId),
      db.from('wings').select('id, name').eq('local_id', localId).order('name'),
      db.from('classes').select('id, name').eq('local_id', localId).order('name'),
      db.from('role_assignments').select('id').eq('local_id', localId).eq('active', true),
      db.from('leadership_positions')
        .select('id, leadership_assignments(member_id, academic_year, end_date)')
        .eq('local_id', localId),
    ]);
    if (mErr) throw new ApiError(500, mErr.message);

    const liveMembers = members ?? [];
    const totalMembers = liveMembers.length;
    const activeMembers = liveMembers.filter((m) => m.status === 'active' || m.status === 'executive').length;

    const today = new Date().toISOString().slice(0, 10);
    const graduationDueCount = liveMembers.filter((m) =>
      (m.status === 'active' || m.status === 'executive') && m.expected_graduation && m.expected_graduation < today,
    ).length;

    const currentYear = currentAcademicYear();
    const leadershipMemberIds = new Set<number>();
    for (const p of positions ?? []) {
      const assignments = (p.leadership_assignments ?? []) as { member_id: number; academic_year: string; end_date: string | null }[];
      for (const a of assignments) {
        if (a.end_date === null && a.academic_year === currentYear) leadershipMemberIds.add(a.member_id);
      }
    }
    const executivesCount = (roleAssignments ?? []).length + leadershipMemberIds.size;

    const wingCounts = new Map<number, number>();
    let noWingCount = 0;
    for (const m of liveMembers) {
      if (m.wing_id) wingCounts.set(m.wing_id, (wingCounts.get(m.wing_id) ?? 0) + 1);
      else noWingCount++;
    }
    const wingBreakdown = (wings ?? []).map((w) => ({ wing_id: w.id, name: w.name, count: wingCounts.get(w.id) ?? 0 }));

    const classCounts = new Map<number, number>();
    for (const m of liveMembers) {
      if (m.class_id) classCounts.set(m.class_id, (classCounts.get(m.class_id) ?? 0) + 1);
    }
    const classBreakdown = (classes ?? []).map((c) => ({ class_id: c.id, name: c.name, count: classCounts.get(c.id) ?? 0 }));

    return NextResponse.json({
      stats: { totalMembers, activeMembers, graduationDueCount, executivesCount },
      wingBreakdown,
      noWingCount,
      classBreakdown,
    });
  } catch (e) { return handleApiError(e); }
}
