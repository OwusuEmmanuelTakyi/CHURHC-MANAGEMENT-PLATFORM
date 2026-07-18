import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, scopeQuery, handleApiError, ApiError } from '@/lib/rbac';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    const today = new Date().toISOString().slice(0, 10);

    let q = db.from('members')
      .select('id, full_name, student_id, level, status, expected_graduation, local_id, wing_id')
      .is('deleted_at', null);

    q = scopeQuery(ctx, q);

    q = q.in('status', ['active', 'executive'])
      .not('expected_graduation', 'is', null)
      .lt('expected_graduation', today)
      .order('expected_graduation', { ascending: true })
      .limit(100);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ members: data, count: data.length });
  } catch (e) { return handleApiError(e); }
}
