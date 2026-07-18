import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, scopeQuery, handleApiError, ApiError } from '@/lib/rbac';
import { wingClassSchema } from '@/lib/schemas';
import { audit } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    const url = new URL(req.url);
    const localId = url.searchParams.get('local_id');

    let q = db.from('classes').select('id, name, local_id').order('name');
    q = scopeQuery(ctx, q);
    if (ctx.role === 'national_president' && localId) q = q.eq('local_id', Number(localId));

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ classes: data });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president');

    const body = wingClassSchema.parse(await req.json());

    const { data, error } = await db.from('classes')
      .insert({ local_id: ctx.localId, name: body.name }).select('id').single();
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'A class with this name already exists');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'class.created', 'class', data.id, { name: body.name });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
