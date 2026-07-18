import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { wingClassSchema } from '@/lib/schemas';
import { audit } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president');
    const id = Number((await params).id);

    const { data: klass } = await db.from('classes').select('id, local_id').eq('id', id).single();
    if (!klass || klass.local_id !== ctx.localId) throw new ApiError(404, 'Class not found');

    const body = wingClassSchema.parse(await req.json());

    const { error } = await db.from('classes').update({ name: body.name }).eq('id', id);
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'A class with this name already exists');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'class.updated', 'class', id, { name: body.name });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
