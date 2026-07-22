import * as XLSX from 'xlsx';
import { z } from 'zod';
import { memberCreateSchema } from './schemas';
import { normalizeGhPhone } from './phone';

// Column headers are the contract between the downloadable template and the parser below —
// change one, change the other.
export const H = {
  studentId: 'Student ID',
  fullName: 'Full Name',
  gender: 'Gender (male/female)',
  phone: 'Phone',
  email: 'Email',
  hall: 'Hall of Residence',
  wing: 'Wing',
  klass: 'Class',
  level: 'Level (100-600)',
  status: 'Status (prospective/active/executive/associate)',
  grad: 'Expected Graduation (YYYY-MM)',
  dob: 'Date of Birth (YYYY-MM-DD)',
} as const;

export const TEMPLATE_HEADERS = Object.values(H);

// Without `raw: true`, SheetJS's CSV/text parser guesses cell types from the
// literal text: a phone number like "0244123456" becomes the number
// 244123456 (leading zero gone), and a date-shaped string like "2027-06"
// becomes an Excel date serial instead of staying the text we asked for in
// the header hint. `raw: true` keeps every cell as the string that was
// actually typed, which is what parseImportRow expects to validate.
export function parseImportFile(buf: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buf, { type: 'buffer', raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

const EXAMPLE_ROW = [
  'UG0012345', 'Ama Serwaa', 'female', '0244123456', 'ama@example.com',
  'Volta Hall', 'Choir', 'Morning Glory', '200', 'active', '2027-06', '2003-04-12',
];

export function buildImportTemplateWorkbook(referenceRows: [string, string][]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW]);
  XLSX.utils.book_append_sheet(wb, ws, 'Members');

  if (referenceRows.length > 0) {
    const refWs = XLSX.utils.aoa_to_sheet([['Wings', 'Classes'], ...referenceRows]);
    XLSX.utils.book_append_sheet(wb, refWs, 'Valid wings & classes');
  }
  return wb;
}

const importRowSchema = memberCreateSchema.omit({ local_id: true });
export type ParsedImportRow = z.infer<typeof importRowSchema>;
export type ParseResult = { data: ParsedImportRow } | { error: string };

export function parseImportRow(
  raw: Record<string, unknown>,
  wingMap: Map<string, number>,
  classMap: Map<string, number>,
): ParseResult {
  const get = (header: string) => String(raw[header] ?? '').trim();

  const phone = normalizeGhPhone(get(H.phone));
  if (!phone) return { error: 'Invalid phone number' };

  let wing_id: number | null = null;
  const wingRaw = get(H.wing);
  if (wingRaw) {
    const found = wingMap.get(wingRaw.toLowerCase());
    if (!found) return { error: `Unknown wing "${wingRaw}"` };
    wing_id = found;
  }

  let class_id: number | null = null;
  const classRaw = get(H.klass);
  if (classRaw) {
    const found = classMap.get(classRaw.toLowerCase());
    if (!found) return { error: `Unknown class "${classRaw}"` };
    class_id = found;
  }

  const gradRaw = get(H.grad);
  if (gradRaw && !/^\d{4}-\d{2}$/.test(gradRaw)) {
    return { error: 'Expected graduation must be in YYYY-MM format' };
  }

  const dobRaw = get(H.dob);
  if (dobRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
    return { error: 'Date of birth must be in YYYY-MM-DD format' };
  }

  const candidate = {
    student_id: get(H.studentId),
    full_name: get(H.fullName),
    gender: get(H.gender).toLowerCase(),
    phone,
    email: get(H.email) || null,
    hall_of_residence: get(H.hall) || null,
    wing_id,
    class_id,
    level: Number(get(H.level)),
    status: get(H.status).toLowerCase() || 'active',
    expected_graduation: gradRaw ? `${gradRaw}-01` : null,
    date_of_birth: dobRaw || null,
  };

  const parsed = importRowSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  return { data: parsed.data };
}
