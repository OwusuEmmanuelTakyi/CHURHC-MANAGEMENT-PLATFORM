import { describe, it, expect } from 'vitest';
import { H, TEMPLATE_HEADERS, parseImportFile, parseImportRow } from './members-import';

// Builds a CSV buffer the same way a user's spreadsheet app would when they
// save the filled-in template — this is what actually gets uploaded, not a
// pre-parsed object, so it exercises the same SheetJS parsing the real
// upload path (app/api/members/import/route.ts) runs.
function csvBuffer(rows: string[][]): Buffer {
  const escape = (v: string) => (/[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const text = rows.map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n';
  return Buffer.from(text, 'utf8');
}

describe('parseImportFile', () => {
  it('maps every template header to its field, from the literal header row the template downloads', () => {
    const row = [
      'UG0012345', 'Ama Serwaa', 'female', '0244123456', 'ama@example.com',
      'Volta Hall', 'Choir', 'Morning Glory', '200', 'active', '2027-06', '2003-04-12',
    ];
    const buf = csvBuffer([TEMPLATE_HEADERS, row]);
    const [parsed] = parseImportFile(buf);

    expect(parsed[H.studentId]).toBe('UG0012345');
    expect(parsed[H.fullName]).toBe('Ama Serwaa');
    expect(parsed[H.gender]).toBe('female');
    expect(parsed[H.phone]).toBe('0244123456');       // leading zero must survive
    expect(parsed[H.email]).toBe('ama@example.com');
    expect(parsed[H.hall]).toBe('Volta Hall');
    expect(parsed[H.wing]).toBe('Choir');
    expect(parsed[H.klass]).toBe('Morning Glory');
    expect(parsed[H.level]).toBe('200');
    expect(parsed[H.status]).toBe('active');
    expect(parsed[H.grad]).toBe('2027-06');            // must stay literal text, not a date serial
    expect(parsed[H.dob]).toBe('2003-04-12');
  });

  it('keeps a leading zero on the phone column instead of coercing it to a number', () => {
    const buf = csvBuffer([TEMPLATE_HEADERS, [
      'UG0000001', 'Kojo Mensah', 'male', '0201234567', '', '', '', '', '100', '', '', '',
    ]]);
    const [parsed] = parseImportFile(buf);
    expect(parsed[H.phone]).toBe('0201234567');
    expect(typeof parsed[H.phone]).toBe('string');
  });

  it('round-trips through parseImportRow: expected_graduation validates instead of failing every row', () => {
    const buf = csvBuffer([TEMPLATE_HEADERS, [
      'UG0012345', 'Ama Serwaa', 'female', '0244123456', 'ama@example.com',
      'Volta Hall', '', '', '200', 'active', '2027-06', '2003-04-12',
    ]]);
    const [raw] = parseImportFile(buf);
    const result = parseImportRow(raw, new Map(), new Map());

    expect('error' in result).toBe(false);
    if ('data' in result) {
      expect(result.data.phone).toBe('+233244123456');
      expect(result.data.expected_graduation).toBe('2027-06-01');
    }
  });
});
