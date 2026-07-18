import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { parseImportRow } from '@/lib/members-import';
import type { ParsedImportRow } from '@/lib/members-import';
import { buildHistoryRows } from '@/lib/member-history';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

const BATCH_SIZE = 500;
const PAGE_SIZE = 1000;

interface ImportRow {
  id: number;
  row_number: number;
  raw_data: Record<string, unknown>;
  resolution: string;
  matched_member_id: number | null;
}

async function fetchAllRows(jobId: string): Promise<ImportRow[]> {
  const rows: ImportRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db.from('import_rows')
      .select('id, row_number, raw_data, resolution, matched_member_id')
      .eq('job_id', jobId).order('row_number').range(from, from + PAGE_SIZE - 1);
    if (error) throw new ApiError(500, error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function mutableFieldsOf(m: ParsedImportRow) {
  return {
    full_name: m.full_name, email: m.email, hall_of_residence: m.hall_of_residence,
    wing_id: m.wing_id, class_id: m.class_id, level: m.level, status: m.status,
    expected_graduation: m.expected_graduation,
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');
    const { jobId } = await params;

    const { data: job } = await db.from('import_jobs').select('*').eq('id', jobId).single();
    if (!job || job.local_id !== ctx.localId) throw new ApiError(404, 'Import job not found');
    if (job.status !== 'awaiting_review') throw new ApiError(409, 'This import has already been processed');

    const body = (await req.json()) as { decisions?: Record<string, 'skip' | 'merge'> };
    const decisions = body.decisions ?? {};

    const allRows = await fetchAllRows(jobId);

    const [{ data: wings }, { data: classes }] = await Promise.all([
      db.from('wings').select('id, name').eq('local_id', ctx.localId),
      db.from('classes').select('id, name').eq('local_id', ctx.localId),
    ]);
    const wingMap = new Map((wings ?? []).map((w) => [w.name.toLowerCase(), w.id]));
    const classMap = new Map((classes ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    const toInsert = allRows.filter((r) => r.resolution === 'new');
    const toMerge = allRows.filter(
      (r) => r.resolution === 'duplicate_existing' && decisions[String(r.row_number)] === 'merge',
    );

    let imported = 0;
    let merged = 0;
    let failed = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const parsed: ParsedImportRow[] = [];
      for (const r of batch) {
        const result = parseImportRow(r.raw_data, wingMap, classMap);
        if ('data' in result) parsed.push(result.data);
        else failed++;
      }
      if (parsed.length === 0) continue;

      const { data: inserted, error } = await db.from('members')
        .insert(parsed.map((m) => ({ ...m, local_id: ctx.localId, created_by: ctx.userId })))
        .select('id');
      if (error || !inserted) { failed += parsed.length; continue; }

      imported += inserted.length;
      const historyRows = inserted.map((row, idx) => ({
        member_id: row.id, event_type: 'joined',
        new_value: { status: parsed[idx].status, level: parsed[idx].level },
        changed_by: ctx.userId, academic_year: currentAcademicYear(),
      }));
      await db.from('member_history').insert(historyRows);
    }

    for (const r of toMerge) {
      const result = parseImportRow(r.raw_data, wingMap, classMap);
      if (!('data' in result) || !r.matched_member_id) { failed++; continue; }

      const { data: old } = await db.from('members').select('*').eq('id', r.matched_member_id).single();
      if (!old) { failed++; continue; }

      const updates = mutableFieldsOf(result.data);
      const { error } = await db.from('members').update(updates).eq('id', r.matched_member_id);
      if (error) { failed++; continue; }

      const historyRows = buildHistoryRows(old, updates, r.matched_member_id, ctx.userId);
      if (historyRows.length) await db.from('member_history').insert(historyRows);
      merged++;
    }

    const skipped = allRows.length - imported - merged - failed;

    await db.from('import_jobs').update({
      status: 'completed', imported_rows: imported + merged, finished_at: new Date().toISOString(),
      error_summary: { imported, merged, skipped, failed },
    }).eq('id', jobId);

    await audit(ctx, 'import.confirmed', 'import_job', jobId, { imported, merged, skipped, failed });

    return NextResponse.json({ imported, merged, skipped, failed });
  } catch (e) { return handleApiError(e); }
}
