import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { currentAcademicYear } from '@/lib/academic-year';
import { DUES_ELIGIBLE_STATUSES } from '@/lib/contributions';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'treasurer');
    const localId = ctx.localId as number;
    const academicYear = currentAcademicYear();

    const [{ data: contributions, error: cErr }, { data: eligibleMembers }] = await Promise.all([
      db.from('contributions')
        .select('id, member_id, amount_pesewas, payment_method, paid_at, academic_year, members(full_name)')
        .eq('local_id', localId).order('paid_at', { ascending: false }),
      db.from('members').select('id').is('deleted_at', null).eq('local_id', localId).in('status', DUES_ELIGIBLE_STATUSES),
    ]);
    if (cErr) throw new ApiError(500, cErr.message);

    const thisYearContributions = (contributions ?? []).filter((c) => c.academic_year === academicYear);
    const duesCollectedPesewas = thisYearContributions.reduce((sum, c) => sum + c.amount_pesewas, 0);
    const momoCount = thisYearContributions.filter((c) => c.payment_method === 'momo').length;
    const cashCount = thisYearContributions.filter((c) => c.payment_method === 'cash').length;

    const paidMemberIds = new Set(thisYearContributions.map((c) => c.member_id));
    const membersOwingCount = (eligibleMembers ?? []).filter((m) => !paidMemberIds.has(m.id)).length;

    // last 5 calendar months (oldest → newest) of income, all methods combined
    const now = new Date();
    const monthlyIncome = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] };
    }).map(({ year, month, label }) => {
      const totalPesewas = (contributions ?? [])
        .filter((c) => {
          const paidAt = new Date(c.paid_at);
          return paidAt.getFullYear() === year && paidAt.getMonth() === month;
        })
        .reduce((sum, c) => sum + c.amount_pesewas, 0);
      return { label, totalPesewas };
    });

    const recentPayments = (contributions ?? []).slice(0, 5).map((c) => ({
      id: c.id,
      member_name: (c.members as unknown as { full_name: string } | null)?.full_name ?? 'Unknown',
      amount_pesewas: c.amount_pesewas,
      payment_method: c.payment_method as 'momo' | 'cash',
      paid_at: c.paid_at,
    }));

    return NextResponse.json({
      stats: { duesCollectedPesewas, membersOwingCount, momoCount, cashCount },
      monthlyIncome,
      recentPayments,
    });
  } catch (e) { return handleApiError(e); }
}
