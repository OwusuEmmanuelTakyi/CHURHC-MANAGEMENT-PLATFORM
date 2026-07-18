import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { handoverSchema } from '@/lib/schemas';
import { nextAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');

    const body = handoverSchema.parse(await req.json());
    const scope = ctx.role === 'national_president' ? 'national' : 'local';
    const localId = ctx.role === 'national_president' ? null : ctx.localId;
    const newYear = nextAcademicYear();

    const positionIds = body.assignments.map((a) => a.position_id);
    if (new Set(positionIds).size !== positionIds.length) {
      throw new ApiError(422, 'Each position can only appear once in a handover');
    }

    const { data: positions } = await db.from('leadership_positions').select('id, scope, local_id').in('id', positionIds);
    if ((positions?.length ?? 0) !== positionIds.length) throw new ApiError(404, 'One or more positions not found');
    for (const p of positions ?? []) {
      if (scope === 'national' && p.scope !== 'national') throw new ApiError(403, 'All positions must be national-scoped');
      if (scope === 'local' && p.local_id !== ctx.localId) throw new ApiError(403, 'All positions must belong to your local');
    }

    if (scope === 'local') {
      const memberIds = body.assignments.map((a) => a.member_id);
      const { data: members } = await db.from('members').select('id, local_id').in('id', memberIds);
      if ((members?.length ?? 0) !== new Set(memberIds).size) throw new ApiError(404, 'One or more members not found');
      for (const m of members ?? []) {
        if (m.local_id !== ctx.localId) throw new ApiError(403, 'All members must belong to your local');
      }
    }

    const { data: result, error } = await db.rpc('perform_handover', {
      p_scope: scope, p_local_id: localId, p_new_academic_year: newYear,
      p_assignments: body.assignments, p_performed_by: ctx.userId,
    });
    if (error) throw new ApiError(500, error.message);

    const row = Array.isArray(result) ? result[0] : result;

    const historyRows = body.assignments.map((a) => ({
      member_id: a.member_id, event_type: 'position_assigned',
      new_value: { position_id: a.position_id }, changed_by: ctx.userId, academic_year: newYear,
    }));
    if (historyRows.length) await db.from('member_history').insert(historyRows);

    await audit(ctx, 'leadership.handover', 'leadership_scope', localId ?? 0, {
      scope, newYear, endedCount: row?.ended_count, createdCount: row?.created_count,
    });

    return NextResponse.json({ newAcademicYear: newYear, endedCount: row?.ended_count, createdCount: row?.created_count });
  } catch (e) { return handleApiError(e); }
}
