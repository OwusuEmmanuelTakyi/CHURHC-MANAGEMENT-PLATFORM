import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { currentAcademicYear } from '@/lib/academic-year';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface MemberRow {
  id: number;
  local_id: number;
  status: string;
  email: string | null;
  joined_at: string;
  deleted_at: string | null;
  expected_graduation: string | null;
}

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president');

    const [{ data: locals, error: lErr }, { data: members, error: mErr }, { data: wings }, { data: roleAssignments }, { data: positions }] = await Promise.all([
      db.from('locals').select('id, name, short_code').eq('active', true).order('name'),
      db.from('members').select('id, local_id, status, email, joined_at, deleted_at, expected_graduation'),
      db.from('wings').select('id, local_id'),
      db.from('role_assignments').select('id').eq('active', true),
      db.from('leadership_positions').select('id, leadership_assignments(academic_year, end_date)').eq('scope', 'national'),
    ]);
    if (lErr) throw new ApiError(500, lErr.message);
    if (mErr) throw new ApiError(500, mErr.message);

    const allMembers = (members ?? []) as MemberRow[];
    const liveMembers = allMembers.filter((m) => !m.deleted_at);

    const totalMembers = liveMembers.length;
    const activeMembers = liveMembers.filter((m) => m.status === 'active' || m.status === 'executive').length;
    const associatesAlumni = liveMembers.filter((m) => m.status === 'associate').length;
    const noEmailCount = liveMembers.filter((m) => !m.email).length;
    const executivesCount = (roleAssignments ?? []).length;

    const today = new Date().toISOString().slice(0, 10);
    const gradOverdueCount = liveMembers.filter((m) =>
      (m.status === 'active' || m.status === 'executive') && m.expected_graduation && m.expected_graduation < today,
    ).length;

    const currentYear = currentAcademicYear();
    let handoverDueCount = 0;
    for (const p of positions ?? []) {
      const assignments = (p.leadership_assignments ?? []) as { academic_year: string; end_date: string | null }[];
      const current = assignments.find((a) => a.end_date === null);
      if (current && current.academic_year !== currentYear) handoverDueCount++;
    }

    const wingCountByLocal = new Map<number, number>();
    for (const w of wings ?? []) wingCountByLocal.set(w.local_id, (wingCountByLocal.get(w.local_id) ?? 0) + 1);

    const now = Date.now();
    const localStats = (locals ?? []).map((l) => {
      const localLive = liveMembers.filter((m) => m.local_id === l.id);
      const localAll = allMembers.filter((m) => m.local_id === l.id);
      const joinedRecently = localAll.filter((m) => now - new Date(m.joined_at).getTime() < THIRTY_DAYS_MS).length;
      const removedRecently = localAll.filter((m) => m.deleted_at && now - new Date(m.deleted_at).getTime() < THIRTY_DAYS_MS).length;
      const trend: 'up' | 'down' | 'flat' = joinedRecently > removedRecently ? 'up' : joinedRecently < removedRecently ? 'down' : 'flat';

      return {
        local_id: l.id,
        name: l.name,
        short_code: l.short_code,
        totalMembers: localLive.length,
        activeMembers: localLive.filter((m) => m.status === 'active' || m.status === 'executive').length,
        wingsCount: wingCountByLocal.get(l.id) ?? 0,
        trend,
      };
    });

    return NextResponse.json({
      stats: { totalMembers, activeMembers, associatesAlumni, executivesCount },
      chartData: localStats.map((l) => ({ short_code: l.short_code, totalMembers: l.totalMembers, activeMembers: l.activeMembers })),
      needsAttention: { gradOverdueCount, noEmailCount, handoverDueCount },
      comparativeLocals: localStats,
    });
  } catch (e) { return handleApiError(e); }
}
