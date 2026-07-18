import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { contributionCreateSchema } from '@/lib/schemas';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'treasurer', 'local_president');

    const url = new URL(req.url);
    const memberId = url.searchParams.get('member_id');
    const academicYear = url.searchParams.get('academic_year');
    const semester = url.searchParams.get('semester');
    const paymentMethod = url.searchParams.get('payment_method');

    let q = db.from('contributions')
      .select(`
        id, member_id, amount_pesewas, payment_method, momo_reference, receipt_note,
        academic_year, semester, paid_at, created_at, members(full_name, student_id)
      `)
      .eq('local_id', ctx.localId)
      .order('paid_at', { ascending: false });

    if (memberId) q = q.eq('member_id', Number(memberId));
    if (academicYear) q = q.eq('academic_year', academicYear);
    if (semester) q = q.eq('semester', semester);
    if (paymentMethod) q = q.eq('payment_method', paymentMethod);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ contributions: data });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'treasurer');

    const body = contributionCreateSchema.parse(await req.json());

    const { data: member } = await db.from('members').select('id, local_id').eq('id', body.member_id).single();
    if (!member) throw new ApiError(404, 'Member not found');
    if (member.local_id !== ctx.localId) throw new ApiError(403, 'Member must belong to your local');

    const { data, error } = await db.from('contributions').insert({
      member_id: body.member_id,
      local_id: ctx.localId,
      amount_pesewas: body.amount_pesewas,
      payment_method: body.payment_method,
      momo_reference: body.momo_reference ?? null,
      receipt_note: body.receipt_note ?? null,
      academic_year: body.academic_year ?? currentAcademicYear(),
      semester: body.semester,
      paid_at: body.paid_at ?? new Date().toISOString().slice(0, 10),
      recorded_by: ctx.userId,
    }).select('id').single();

    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'This MoMo reference has already been recorded');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'contribution.recorded', 'contribution', data.id, {
      member_id: body.member_id, amount_pesewas: body.amount_pesewas,
    });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
