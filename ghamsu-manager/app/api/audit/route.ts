import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');

    const url = new URL(req.url);
    const before = url.searchParams.get('before');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
    const entityType = url.searchParams.get('entity_type');
    const action = url.searchParams.get('action');

    let q = db.from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, local_id, metadata, created_at, executives(name)')
      .order('id', { ascending: false })
      .limit(limit);

    if (ctx.role !== 'national_president') q = q.eq('local_id', ctx.localId);
    if (before) q = q.lt('id', Number(before));
    if (entityType) q = q.eq('entity_type', entityType);
    if (action) q = q.eq('action', action);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({
      logs: data,
      nextCursor: data.length === limit ? data[data.length - 1].id : null,
    });
  } catch (e) { return handleApiError(e); }
}
