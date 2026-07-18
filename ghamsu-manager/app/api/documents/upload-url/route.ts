import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { documentUploadUrlSchema } from '@/lib/schemas';
import { sanitizeFilename } from '@/lib/documents';
import { currentAcademicYear } from '@/lib/academic-year';

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'secretary');

    const body = documentUploadUrlSchema.parse(await req.json());

    const key = `documents/${ctx.localId}/${currentAcademicYear()}/${randomUUID()}-${sanitizeFilename(body.name)}`;

    const { data, error } = await db.storage.from('documents').createSignedUploadUrl(key);
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path: data.path });
  } catch (e) { return handleApiError(e); }
}
