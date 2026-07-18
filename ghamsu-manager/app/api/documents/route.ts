import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { documentCreateSchema } from '@/lib/schemas';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');

    const url = new URL(req.url);
    const documentType = url.searchParams.get('document_type');
    const academicYear = url.searchParams.get('academic_year');
    const status = url.searchParams.get('status');

    let q = db.from('documents')
      .select('id, local_id, name, document_type, academic_year, file_size_bytes, mime_type, status, uploaded_by, approved_by, created_at')
      .order('created_at', { ascending: false });
    if (ctx.role !== 'national_president') q = q.eq('local_id', ctx.localId);
    if (documentType) q = q.eq('document_type', documentType);
    if (academicYear) q = q.eq('academic_year', academicYear);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    const executiveIds = Array.from(new Set(
      (data ?? []).flatMap((d) => [d.uploaded_by, d.approved_by].filter((id): id is string => !!id)),
    ));
    const { data: executives } = executiveIds.length
      ? await db.from('executives').select('id, name').in('id', executiveIds)
      : { data: [] };
    const nameMap = new Map((executives ?? []).map((e) => [e.id, e.name]));

    const documents = (data ?? []).map((d) => ({
      ...d,
      uploaded_by_name: nameMap.get(d.uploaded_by) ?? null,
      approved_by_name: d.approved_by ? (nameMap.get(d.approved_by) ?? null) : null,
    }));

    return NextResponse.json({ documents });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'secretary');

    const body = documentCreateSchema.parse(await req.json());

    if (!body.file_url.startsWith(`documents/${ctx.localId}/`)) {
      throw new ApiError(403, 'This upload does not belong to your local');
    }

    const { data, error } = await db.from('documents').insert({
      local_id: ctx.localId,
      name: body.name,
      document_type: body.document_type,
      academic_year: body.academic_year ?? currentAcademicYear(),
      file_url: body.file_url,
      file_size_bytes: body.file_size_bytes,
      mime_type: body.mime_type,
      status: 'pending',
      uploaded_by: ctx.userId,
    }).select('id').single();
    if (error) throw new ApiError(500, error.message);

    await audit(ctx, 'document.uploaded', 'document', data.id, { name: body.name });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
