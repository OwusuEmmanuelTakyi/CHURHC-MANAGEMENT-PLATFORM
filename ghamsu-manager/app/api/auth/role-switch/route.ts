import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, handleApiError, ApiError } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    enforceRateLimit(`role-switch:${clientIp(req)}`, 20, 60_000);
    const ctx = await getScopedContext();
    const { assignmentId } = await req.json();

    const { data: target } = await db
      .from('role_assignments')
      .select('id')
      .eq('id', assignmentId)
      .eq('user_id', ctx.userId)   // can only switch to a role you actually hold
      .eq('active', true)
      .single();
    if (!target) throw new ApiError(403, 'You do not hold that role');

    await audit(ctx, 'auth.role_switched', 'role_assignment', assignmentId);

    const res = NextResponse.json({ ok: true });
    res.cookies.set('active_role', String(assignmentId), {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/',
    });
    return res;
  } catch (e) { return handleApiError(e); }
}