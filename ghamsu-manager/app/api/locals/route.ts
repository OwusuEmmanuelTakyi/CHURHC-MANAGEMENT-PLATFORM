import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { localCreateSchema } from '@/lib/schemas';
import { audit } from '@/lib/audit';

export async function GET() {
  try {
    const ctx = await getScopedContext();

    let q = db.from('locals').select('id, name, short_code, university_name, active').order('name');
    if (ctx.role !== 'national_president') q = q.eq('id', ctx.localId);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ locals: data });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president');

    const body = localCreateSchema.parse(await req.json());

    const { data, error } = await db.from('locals').insert(body).select('id').single();
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'A local with this short code already exists');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'local.created', 'local', data.id, { name: body.name });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
