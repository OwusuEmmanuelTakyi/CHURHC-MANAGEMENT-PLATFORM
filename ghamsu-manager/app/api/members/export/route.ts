import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const HEADERS = [
  'Student ID', 'Full Name', 'Gender', 'Phone', 'Email', 'Hall of Residence',
  'Wing', 'Class', 'Level', 'Status', 'Expected Graduation', 'Date of Birth', 'Joined At',
];

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'local_president', 'secretary');

    const url = new URL(req.url);
    const format = url.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
    const status = url.searchParams.get('status');
    const wingId = url.searchParams.get('wing_id');
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('q');

    let q = db.from('members')
      .select('student_id, full_name, gender, phone, email, hall_of_residence, wing_id, class_id, level, status, expected_graduation, date_of_birth, joined_at')
      .is('deleted_at', null).eq('local_id', ctx.localId).order('full_name');
    if (status) q = q.eq('status', status);
    if (wingId) q = q.eq('wing_id', Number(wingId));
    if (level) q = q.eq('level', Number(level));
    if (search) q = q.ilike('full_name', `%${search}%`);

    const { data: members, error } = await q;
    if (error) throw new ApiError(500, error.message);

    const [{ data: wings }, { data: classes }] = await Promise.all([
      db.from('wings').select('id, name').eq('local_id', ctx.localId),
      db.from('classes').select('id, name').eq('local_id', ctx.localId),
    ]);
    const wingMap = new Map((wings ?? []).map((w) => [w.id, w.name]));
    const classMap = new Map((classes ?? []).map((c) => [c.id, c.name]));

    const rows = (members ?? []).map((m) => [
      m.student_id, m.full_name, m.gender, m.phone, m.email ?? '', m.hall_of_residence ?? '',
      m.wing_id ? (wingMap.get(m.wing_id) ?? '') : '', m.class_id ? (classMap.get(m.class_id) ?? '') : '',
      String(m.level), m.status, m.expected_graduation ?? '', m.date_of_birth ?? '', m.joined_at,
    ]);

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Members');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="members.xlsx"',
        },
      });
    }

    const csv = [HEADERS, ...rows].map((r) => r.map((v) => csvEscape(String(v))).join(',')).join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="members.csv"',
      },
    });
  } catch (e) { return handleApiError(e); }
}
