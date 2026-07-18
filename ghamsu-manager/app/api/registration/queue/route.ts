import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const { data, error } = await db.from('member_registrations')
      .select(`
        id, full_name, gender, phone, email, student_id, hall_of_residence,
        wing_id, class_id, level, expected_graduation, date_of_birth,
        status, matched_member_id, created_at
      `)
      .eq('local_id', ctx.localId).eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw new ApiError(500, error.message);

    const matchedIds = Array.from(new Set(
      (data ?? []).map((r) => r.matched_member_id).filter((id): id is number => !!id),
    ));
    const { data: matchedMembers } = matchedIds.length
      ? await db.from('members').select('id, full_name').in('id', matchedIds)
      : { data: [] };
    const matchedNameMap = new Map((matchedMembers ?? []).map((m) => [m.id, m.full_name]));

    const registrations = (data ?? []).map((r) => ({
      ...r,
      matched_member_name: r.matched_member_id ? (matchedNameMap.get(r.matched_member_id) ?? null) : null,
    }));

    return NextResponse.json({ registrations });
  } catch (e) { return handleApiError(e); }
}
