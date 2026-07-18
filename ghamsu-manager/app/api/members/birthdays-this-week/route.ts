import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, scopeQuery, handleApiError, ApiError } from '@/lib/rbac';
import { daysUntilNextBirthday } from '@/lib/birthdays';

export async function GET() {
  try {
    const ctx = await getScopedContext();

    let q = db.from('members').select('id, full_name, date_of_birth, local_id').is('deleted_at', null);
    q = scopeQuery(ctx, q);
    q = q.not('date_of_birth', 'is', null);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    const upcoming = (data ?? [])
      .map((m) => ({ ...m, daysUntil: daysUntilNextBirthday(m.date_of_birth) }))
      .filter((m): m is typeof m & { daysUntil: number } => m.daysUntil !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({ members: upcoming });
  } catch (e) { return handleApiError(e); }
}
