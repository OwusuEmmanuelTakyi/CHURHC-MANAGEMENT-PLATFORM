import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { currentAcademicYear } from '@/lib/academic-year';
import { formatGHS } from '@/lib/currency';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

interface ContributionExportRow {
  amount_pesewas: number;
  payment_method: string;
  momo_reference: string | null;
  semester: string;
  academic_year: string;
  paid_at: string;
  members: { full_name: string; student_id: string } | null;
  executives: { name: string } | null;
}

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'treasurer');

    const url = new URL(req.url);
    const academicYear = url.searchParams.get('academic_year') ?? currentAcademicYear();
    const semester = url.searchParams.get('semester');

    let q = db.from('contributions')
      .select(`
        amount_pesewas, payment_method, momo_reference, semester, academic_year, paid_at,
        members(full_name, student_id), executives(name)
      `)
      .eq('local_id', ctx.localId).eq('academic_year', academicYear)
      .order('paid_at', { ascending: false });
    if (semester) q = q.eq('semester', semester);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    const header = ['Member', 'Student ID', 'Amount', 'Method', 'MoMo Reference', 'Semester', 'Academic Year', 'Paid At', 'Recorded By'];
    const rows = ((data ?? []) as unknown as ContributionExportRow[]).map((c) => [
      c.members?.full_name ?? '', c.members?.student_id ?? '', formatGHS(c.amount_pesewas),
      c.payment_method, c.momo_reference ?? '', c.semester, c.academic_year, c.paid_at, c.executives?.name ?? '',
    ]);

    const csv = [header, ...rows].map((r) => r.map((v) => csvEscape(String(v))).join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contributions-${academicYear.replace('/', '-')}.csv"`,
      },
    });
  } catch (e) { return handleApiError(e); }
}
