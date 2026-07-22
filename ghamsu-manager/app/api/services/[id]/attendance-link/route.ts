import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { audit } from '@/lib/audit';

async function loadOwnedService(ctx: Awaited<ReturnType<typeof getScopedContext>>, id: number) {
  const { data: service } = await db.from('services').select('id, local_id').eq('id', id).single();
  if (!service) throw new ApiError(404, 'Service not found');
  if (service.local_id !== ctx.localId) throw new ApiError(403, 'Not permitted for this service');
  return service;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);
    await loadOwnedService(ctx, id);

    const { data: link } = await db.from('attendance_links')
      .select('token').eq('service_id', id).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    return NextResponse.json({ token: link?.token ?? null });
  } catch (e) { return handleApiError(e); }
}

// Idempotent by design: re-clicking "Get check-in link" in the UI shouldn't
// spawn a second valid link for the same event — return the existing active
// one if there is one instead of creating a duplicate.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);
    await loadOwnedService(ctx, id);

    const { data: existing } = await db.from('attendance_links')
      .select('token').eq('service_id', id).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ token: existing.token });

    const { data: link, error } = await db.from('attendance_links').insert({
      service_id: id, created_by: ctx.userId,
    }).select('token').single();
    if (error || !link) throw new ApiError(500, error?.message ?? 'Could not create the check-in link');

    await audit(ctx, 'attendance_link.created', 'attendance_link', link.token, { service_id: id });
    return NextResponse.json({ token: link.token }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);
    await loadOwnedService(ctx, id);

    const { error } = await db.from('attendance_links').update({ active: false }).eq('service_id', id).eq('active', true);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'attendance_link.revoked', 'service', id);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
