import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { currentAcademicYear } from '@/lib/academic-year';
import { DUES_ELIGIBLE_STATUSES } from '@/lib/contributions';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'treasurer');

    const url = new URL(req.url);
    const academicYear = url.searchParams.get('academic_year') ?? currentAcademicYear();

    let contribQuery = db.from('contributions')
      .select('local_id, member_id, amount_pesewas, payment_method, semester')
      .eq('academic_year', academicYear);
    let memberQuery = db.from('members')
      .select('id, local_id, status').is('deleted_at', null).in('status', DUES_ELIGIBLE_STATUSES);

    if (ctx.role !== 'national_president') {
      contribQuery = contribQuery.eq('local_id', ctx.localId);
      memberQuery = memberQuery.eq('local_id', ctx.localId);
    }

    const [{ data: contributions, error: cErr }, { data: members, error: mErr }] = await Promise.all([contribQuery, memberQuery]);
    if (cErr) throw new ApiError(500, cErr.message);
    if (mErr) throw new ApiError(500, mErr.message);

    const totalsMap = new Map<string, {
      local_id: number; semester: string; payment_method: string; totalPesewas: number; count: number;
    }>();
    const paidByLocalSemester = new Map<string, Set<number>>();

    for (const c of contributions ?? []) {
      const totalsKey = `${c.local_id}|${c.semester}|${c.payment_method}`;
      const existing = totalsMap.get(totalsKey);
      if (existing) {
        existing.totalPesewas += c.amount_pesewas;
        existing.count += 1;
      } else {
        totalsMap.set(totalsKey, {
          local_id: c.local_id, semester: c.semester, payment_method: c.payment_method,
          totalPesewas: c.amount_pesewas, count: 1,
        });
      }

      const paidKey = `${c.local_id}|${c.semester}`;
      if (!paidByLocalSemester.has(paidKey)) paidByLocalSemester.set(paidKey, new Set());
      paidByLocalSemester.get(paidKey)!.add(c.member_id);
    }

    const eligibleByLocal = new Map<number, number>();
    for (const m of members ?? []) {
      eligibleByLocal.set(m.local_id, (eligibleByLocal.get(m.local_id) ?? 0) + 1);
    }

    const duesStatus: { local_id: number; semester: string; paidCount: number; unpaidCount: number }[] = [];
    for (const [localId, eligibleCount] of eligibleByLocal) {
      for (const semester of ['first', 'second'] as const) {
        const paidCount = paidByLocalSemester.get(`${localId}|${semester}`)?.size ?? 0;
        duesStatus.push({ local_id: localId, semester, paidCount, unpaidCount: eligibleCount - paidCount });
      }
    }

    return NextResponse.json({
      academicYear,
      totals: Array.from(totalsMap.values()),
      duesStatus,
    });
  } catch (e) { return handleApiError(e); }
}
