import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { localUpdateSchema } from '@/lib/schemas';
import { audit } from '@/lib/audit';

function assertCanView(ctx: Awaited<ReturnType<typeof getScopedContext>>, id: number) {
  if (ctx.role !== 'national_president' && ctx.localId !== id) {
    throw new ApiError(403, 'Not permitted to view this local');
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    const id = Number((await params).id);
    assertCanView(ctx, id);

    const { data: local, error } = await db.from('locals')
      .select('id, name, short_code, university_name, active').eq('id', id).single();
    if (error || !local) throw new ApiError(404, 'Local not found');

    const [{ data: wings }, { data: classes }, { data: members }] = await Promise.all([
      db.from('wings').select('id, name, local_id').eq('local_id', id).order('name'),
      db.from('classes').select('id, name, local_id').eq('local_id', id).order('name'),
      db.from('members').select('wing_id, class_id').eq('local_id', id).is('deleted_at', null),
    ]);

    const wingCounts = new Map<number, number>();
    const classCounts = new Map<number, number>();
    for (const m of members ?? []) {
      if (m.wing_id) wingCounts.set(m.wing_id, (wingCounts.get(m.wing_id) ?? 0) + 1);
      if (m.class_id) classCounts.set(m.class_id, (classCounts.get(m.class_id) ?? 0) + 1);
    }

    return NextResponse.json({
      local,
      wings: (wings ?? []).map((w) => ({ ...w, memberCount: wingCounts.get(w.id) ?? 0 })),
      classes: (classes ?? []).map((c) => ({ ...c, memberCount: classCounts.get(c.id) ?? 0 })),
    });
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president');
    const id = Number((await params).id);

    const updates = localUpdateSchema.parse(await req.json());

    const { error } = await db.from('locals').update(updates).eq('id', id);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'local.updated', 'local', id, { fields: Object.keys(updates) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
