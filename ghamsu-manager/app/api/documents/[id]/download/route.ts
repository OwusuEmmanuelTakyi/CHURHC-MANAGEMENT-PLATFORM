import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');
    const id = Number((await params).id);

    const { data: doc } = await db.from('documents').select('id, local_id, file_url').eq('id', id).single();
    if (!doc) throw new ApiError(404, 'Document not found');
    if (ctx.role !== 'national_president' && doc.local_id !== ctx.localId) {
      throw new ApiError(403, 'Not permitted to download this document');
    }

    const { data, error } = await db.storage.from('documents').createSignedUrl(doc.file_url, 60);
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ url: data.signedUrl });
  } catch (e) { return handleApiError(e); }
}
