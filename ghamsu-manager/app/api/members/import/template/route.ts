import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError } from '@/lib/rbac';
import { buildImportTemplateWorkbook } from '@/lib/members-import';

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const [{ data: wings }, { data: classes }] = await Promise.all([
      db.from('wings').select('name').eq('local_id', ctx.localId).order('name'),
      db.from('classes').select('name').eq('local_id', ctx.localId).order('name'),
    ]);

    const maxLen = Math.max(wings?.length ?? 0, classes?.length ?? 0);
    const referenceRows: [string, string][] = Array.from({ length: maxLen }, (_, i) => [
      wings?.[i]?.name ?? '', classes?.[i]?.name ?? '',
    ]);

    const wb = buildImportTemplateWorkbook(referenceRows);
    const format = new URL(req.url).searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets['Members']);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="ghamsu-members-template.csv"',
        },
      });
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ghamsu-members-template.xlsx"',
      },
    });
  } catch (e) { return handleApiError(e); }
}
