import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { positionUpdateSchema } from '@/lib/schemas';
import { assertOwnsPosition } from '@/lib/leadership';
import { audit } from '@/lib/audit';

async function loadPosition(id: number) {
  const { data } = await db.from('leadership_positions').select('id, scope, local_id').eq('id', id).single();
  if (!data) throw new ApiError(404, 'Position not found');
  return data;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');
    const id = Number((await params).id);

    const position = await loadPosition(id);
    assertOwnsPosition(ctx, position);

    const body = positionUpdateSchema.parse(await req.json());

    const { error } = await db.from('leadership_positions').update({ title: body.title }).eq('id', id);
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'A position with this title already exists in this scope');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'leadership.position_updated', 'leadership_position', id, { title: body.title });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');
    const id = Number((await params).id);

    const position = await loadPosition(id);
    assertOwnsPosition(ctx, position);

    const { error } = await db.from('leadership_positions').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new ApiError(409, 'This position has assignment history and cannot be deleted');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'leadership.position_deleted', 'leadership_position', id);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
