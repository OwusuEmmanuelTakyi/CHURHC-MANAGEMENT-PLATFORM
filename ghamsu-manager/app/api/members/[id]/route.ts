import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, scopeQuery, handleApiError, ApiError } from '@/lib/rbac';
import { memberUpdateSchema } from '@/lib/schemas';
import { normalizeGhPhone } from '@/lib/phone';
import { audit } from '@/lib/audit';
import { buildHistoryRows } from '@/lib/member-history';

async function loadScoped(ctx: Awaited<ReturnType<typeof getScopedContext>>, id: number) {
  let q = db.from('members').select('*').eq('id', id).is('deleted_at', null);
  q = scopeQuery(ctx, q);
  const { data } = await q.single();
  if (!data) throw new ApiError(404, 'Member not found');
  return data;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    const { id } = await params;
    const member = await loadScoped(ctx, Number(id));

    const { data: history } = await db.from('member_history')
      .select('event_type, old_value, new_value, created_at, executives(name)')
      .eq('member_id', member.id).order('created_at', { ascending: false }).limit(50);

    return NextResponse.json({ member, history });
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const { id } = await params;

    const old = await loadScoped(ctx, Number(id));
    const updates = memberUpdateSchema.parse(await req.json());

    if (updates.phone) {
      const p = normalizeGhPhone(updates.phone);
      if (!p) throw new ApiError(422, 'Invalid Ghanaian phone number');
      updates.phone = p;
    }

    const { error } = await db.from('members').update(updates).eq('id', old.id);
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'Phone or student ID already in use');
      throw new ApiError(500, error.message);
    }

    const historyRows = buildHistoryRows(old, updates, old.id, ctx.userId);
    if (historyRows.length) await db.from('member_history').insert(historyRows);

    await audit(ctx, 'member.updated', 'member', old.id, { fields: Object.keys(updates) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president');   // only presidents remove members
    const { id } = await params;

    const member = await loadScoped(ctx, Number(id));
    await db.from('members').update({ deleted_at: new Date().toISOString() }).eq('id', member.id);
    await audit(ctx, 'member.deleted', 'member', member.id, { name: member.full_name });

    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}