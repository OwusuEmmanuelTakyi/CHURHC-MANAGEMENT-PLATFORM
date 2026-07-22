import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { attendanceLinkCreateSchema, attendanceLinkRevokeSchema } from '@/lib/schemas';
import { endOfServiceDay, generateCheckInPasscode, hashPasscode } from '@/lib/attendance';
import { audit } from '@/lib/audit';

async function loadOwnedService(ctx: Awaited<ReturnType<typeof getScopedContext>>, id: number) {
  const { data: service } = await db.from('services').select('id, local_id, service_date').eq('id', id).single();
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

    const { data: links } = await db.from('attendance_links')
      .select('token, kind, label, created_at, expires_at').eq('service_id', id).eq('active', true)
      .order('created_at', { ascending: false });

    const selfLink = (links ?? []).find((l) => l.kind === 'self');
    const self = selfLink ? { token: selfLink.token, expires_at: selfLink.expires_at } : null;
    const usherLinks = (links ?? [])
      .filter((l) => l.kind === 'usher')
      .map((l) => ({ token: l.token, label: l.label, created_at: l.created_at, expires_at: l.expires_at }));

    return NextResponse.json({ self, usherLinks });
  } catch (e) { return handleApiError(e); }
}

// Self links are idempotent by design: re-clicking "Get check-in link" in the
// UI shouldn't spawn a duplicate for the same event. Usher links are not —
// each click makes a distinct link + passcode, since a local may want one
// per usher.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);
    const service = await loadOwnedService(ctx, id);

    const body = attendanceLinkCreateSchema.parse(await req.json().catch(() => ({})));
    const expiresAt = endOfServiceDay(service.service_date);

    if (body.kind === 'self') {
      const { data: existing } = await db.from('attendance_links')
        .select('token').eq('service_id', id).eq('kind', 'self').eq('active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (existing) return NextResponse.json({ token: existing.token });

      const { data: link, error } = await db.from('attendance_links').insert({
        service_id: id, kind: 'self', created_by: ctx.userId, expires_at: expiresAt,
      }).select('token').single();
      if (error || !link) throw new ApiError(500, error?.message ?? 'Could not create the check-in link');

      await audit(ctx, 'attendance_link.created', 'attendance_link', link.token, { service_id: id, kind: 'self' });
      return NextResponse.json({ token: link.token }, { status: 201 });
    }

    const passcode = generateCheckInPasscode();
    const { data: link, error } = await db.from('attendance_links').insert({
      service_id: id, kind: 'usher', label: body.label ?? null,
      passcode_hash: hashPasscode(passcode), created_by: ctx.userId, expires_at: expiresAt,
    }).select('token').single();
    if (error || !link) throw new ApiError(500, error?.message ?? 'Could not create the usher link');

    await audit(ctx, 'attendance_link.created', 'attendance_link', link.token, { service_id: id, kind: 'usher' });
    return NextResponse.json({ token: link.token, passcode }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const id = Number((await params).id);
    await loadOwnedService(ctx, id);

    const { token } = attendanceLinkRevokeSchema.parse(await req.json());

    const { data: link } = await db.from('attendance_links').select('token, service_id').eq('token', token).single();
    if (!link || link.service_id !== id) throw new ApiError(404, 'Link not found');

    const { error } = await db.from('attendance_links').update({ active: false }).eq('token', token);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'attendance_link.revoked', 'attendance_link', token, { service_id: id });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
