import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'secretary');
    const localId = ctx.localId as number;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: documents, error: dErr },
      { count: membersCount },
      { data: auditRows, error: aErr },
    ] = await Promise.all([
      db.from('documents').select('id, name, document_type, status, created_at')
        .eq('local_id', localId).order('created_at', { ascending: false }),
      db.from('members').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('local_id', localId),
      db.from('audit_logs').select('id, action, user_id, created_at, executives(name)')
        .eq('local_id', localId).order('created_at', { ascending: false }).limit(8),
    ]);
    if (dErr) throw new ApiError(500, dErr.message);
    if (aErr) throw new ApiError(500, aErr.message);

    const documentsCount = (documents ?? []).length;
    const pendingUploadCount = (documents ?? []).filter((d) => d.status === 'pending').length;

    const auditEventsThisWeek = await db.from('audit_logs')
      .select('id', { count: 'exact', head: true }).eq('local_id', localId).gte('created_at', sevenDaysAgo);

    const recentDocuments = (documents ?? []).slice(0, 8).map((d) => ({
      id: d.id, name: d.name, document_type: d.document_type,
      status: d.status as 'pending' | 'approved', created_at: d.created_at,
    }));

    const recentAuditEvents = (auditRows ?? []).map((r) => ({
      id: r.id, action: r.action,
      actorName: (r.executives as unknown as { name: string } | null)?.name ?? null,
      created_at: r.created_at,
    }));

    // last 3 completed calendar months — flag any with no 'minutes' document uploaded
    const now = new Date();
    const monthsMissingMinutes: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const hasMinutes = (documents ?? []).some((doc) => {
        if (doc.document_type !== 'minutes') return false;
        const created = new Date(doc.created_at);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      });
      if (!hasMinutes) monthsMissingMinutes.push(`${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`);
    }

    return NextResponse.json({
      stats: {
        documentsCount,
        pendingUploadCount,
        membersCount: membersCount ?? 0,
        auditEventsThisWeek: auditEventsThisWeek.count ?? 0,
      },
      recentDocuments,
      recentAuditEvents,
      monthsMissingMinutes,
    });
  } catch (e) { return handleApiError(e); }
}
