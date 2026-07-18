import { NextResponse } from 'next/server';
import { getScopedContext, requireRole, handleApiError } from '@/lib/rbac';
import { computeLocalAttendanceAnalytics } from '@/lib/attendance-analytics';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const url = new URL(req.url);
    const missedThreshold = Math.max(1, Math.min(Number(url.searchParams.get('missedThreshold') ?? 3), 12));

    const analytics = await computeLocalAttendanceAnalytics(ctx.localId!, missedThreshold);
    return NextResponse.json(analytics);
  } catch (e) { return handleApiError(e); }
}
