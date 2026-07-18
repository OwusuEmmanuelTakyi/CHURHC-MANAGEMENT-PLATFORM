import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { audit } from '@/lib/audit';

export async function PATCH(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const { token } = await params;

    const { data: link } = await db.from('registration_links').select('token, local_id').eq('token', token).single();
    if (!link || link.local_id !== ctx.localId) throw new ApiError(404, 'Link not found');

    const { error } = await db.from('registration_links').update({ active: false }).eq('token', token);
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'registration_link.deactivated', 'registration_link', token);
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
