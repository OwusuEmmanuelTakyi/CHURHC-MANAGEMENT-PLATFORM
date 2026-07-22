import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { parseImportRow, parseImportFile, H } from '@/lib/members-import';
import { audit } from '@/lib/audit';

const MAX_ROWS = 5000;
const BATCH_SIZE = 500;

type Resolution = 'new' | 'duplicate_in_file' | 'duplicate_existing' | 'invalid';

interface StagedRow {
  row_number: number;
  raw_data: Record<string, unknown>;
  normalized_phone: string | null;
  resolution: Resolution;
  matched_member_id: number | null;
  error_detail: string | null;
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(422, 'No file uploaded');

    const buf = Buffer.from(await file.arrayBuffer());
    const rawRows = parseImportFile(buf);

    if (rawRows.length === 0) throw new ApiError(422, 'The file has no data rows');
    if (rawRows.length > MAX_ROWS) throw new ApiError(422, `Too many rows — max ${MAX_ROWS} per import`);

    const [{ data: wings }, { data: classes }] = await Promise.all([
      db.from('wings').select('id, name').eq('local_id', ctx.localId),
      db.from('classes').select('id, name').eq('local_id', ctx.localId),
    ]);
    const wingMap = new Map((wings ?? []).map((w) => [w.name.toLowerCase(), w.id]));
    const classMap = new Map((classes ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    const seenPhones = new Set<string>();
    const staged: StagedRow[] = rawRows.map((raw, i) => {
      const row_number = i + 2; // header occupies row 1
      const result = parseImportRow(raw, wingMap, classMap);

      if ('error' in result) {
        return { row_number, raw_data: raw, normalized_phone: null, resolution: 'invalid', matched_member_id: null, error_detail: result.error };
      }
      const phone = result.data.phone;
      if (seenPhones.has(phone)) {
        return { row_number, raw_data: raw, normalized_phone: phone, resolution: 'duplicate_in_file', matched_member_id: null, error_detail: null };
      }
      seenPhones.add(phone);
      return { row_number, raw_data: raw, normalized_phone: phone, resolution: 'new', matched_member_id: null, error_detail: null };
    });

    const candidatePhones = staged.filter((r) => r.resolution === 'new').map((r) => r.normalized_phone as string);
    if (candidatePhones.length > 0) {
      const { data: existing } = await db.from('members')
        .select('id, phone').eq('local_id', ctx.localId).is('deleted_at', null).in('phone', candidatePhones);
      const existingMap = new Map((existing ?? []).map((m) => [m.phone, m.id]));
      for (const row of staged) {
        const matchId = row.resolution === 'new' && row.normalized_phone ? existingMap.get(row.normalized_phone) : undefined;
        if (matchId) {
          row.resolution = 'duplicate_existing';
          row.matched_member_id = matchId;
        }
      }
    }

    const summary = {
      total: staged.length,
      new: staged.filter((r) => r.resolution === 'new').length,
      duplicateInFile: staged.filter((r) => r.resolution === 'duplicate_in_file').length,
      duplicateExisting: staged.filter((r) => r.resolution === 'duplicate_existing').length,
      invalid: staged.filter((r) => r.resolution === 'invalid').length,
      missingEmail: staged.filter((r) => r.resolution === 'new' && !String(r.raw_data[H.email] ?? '').trim()).length,
    };

    const storageKey = `${ctx.localId}/${randomUUID()}-${file.name}`;
    const { error: uploadError } = await db.storage.from('imports').upload(storageKey, buf, {
      contentType: file.type || 'application/octet-stream',
    });
    if (uploadError) throw new ApiError(500, `Could not store the file: ${uploadError.message}`);

    const { data: job, error: jobError } = await db.from('import_jobs').insert({
      local_id: ctx.localId, uploaded_by: ctx.userId, file_url: storageKey, original_name: file.name,
      status: 'awaiting_review', total_rows: summary.total, valid_rows: summary.new,
      duplicate_rows: summary.duplicateInFile + summary.duplicateExisting, invalid_rows: summary.invalid,
    }).select('id').single();
    if (jobError || !job) throw new ApiError(500, jobError?.message ?? 'Could not create the import job');

    for (let i = 0; i < staged.length; i += BATCH_SIZE) {
      const batch = staged.slice(i, i + BATCH_SIZE).map((r) => ({
        job_id: job.id, row_number: r.row_number, raw_data: r.raw_data,
        normalized_phone: r.normalized_phone, resolution: r.resolution,
        matched_member_id: r.matched_member_id, error_detail: r.error_detail,
      }));
      const { error } = await db.from('import_rows').insert(batch);
      if (error) throw new ApiError(500, error.message);
    }

    await audit(ctx, 'import.staged', 'import_job', job.id, summary);

    const reviewRows = staged
      .filter((r) => r.resolution !== 'new')
      .map((r) => ({ row_number: r.row_number, resolution: r.resolution, raw_data: r.raw_data, error_detail: r.error_detail }));

    return NextResponse.json({ jobId: job.id, summary, reviewRows });
  } catch (e) { return handleApiError(e); }
}
