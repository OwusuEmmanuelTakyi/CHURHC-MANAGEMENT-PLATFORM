import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { registrationLinkCreateSchema } from '@/lib/schemas';
import { audit } from '@/lib/audit';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const { data, error } = await db.from('registration_links')
      .select('token, active, expires_at, created_at')
      .eq('local_id', ctx.localId)
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ links: data });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const body = registrationLinkCreateSchema.parse(await req.json().catch(() => ({})));

    const { data, error } = await db.from('registration_links').insert({
      local_id: ctx.localId,
      expires_at: body.expires_at ?? null,
      created_by: ctx.userId,
    }).select('token').single();
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'registration_link.created', 'registration_link', data.token);
    return NextResponse.json({ token: data.token }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
