import { describe, it, expect } from 'vitest';
import { currentAcademicYear, nextAcademicYear, shiftAcademicYear } from './academic-year';

// Built with the local Date(year, monthIndex, day) constructor (not ISO strings)
// so the boundary assertions don't depend on the test machine's timezone —
// currentAcademicYear() itself reads getMonth()/getFullYear() in local time.

describe('currentAcademicYear', () => {
  it('returns year/year+1 for a date in September', () => {
    expect(currentAcademicYear(new Date(2026, 8, 1))).toBe('2026/2027');
  });

  it('returns year/year+1 for a date in December', () => {
    expect(currentAcademicYear(new Date(2026, 11, 15))).toBe('2026/2027');
  });

  it('returns year-1/year for a date in January', () => {
    expect(currentAcademicYear(new Date(2027, 0, 10))).toBe('2026/2027');
  });

  it('returns year-1/year for a date in August', () => {
    expect(currentAcademicYear(new Date(2027, 7, 31))).toBe('2026/2027');
  });

  it('flips exactly at the September 1 boundary', () => {
    expect(currentAcademicYear(new Date(2026, 7, 31, 23))).toBe('2025/2026');
    expect(currentAcademicYear(new Date(2026, 8, 1, 0))).toBe('2026/2027');
  });
});

describe('nextAcademicYear', () => {
  it('increments both halves of the year string', () => {
    expect(nextAcademicYear('2026/2027')).toBe('2027/2028');
  });

  it('defaults to rolling forward from the current academic year', () => {
    const current = currentAcademicYear();
    const [start, end] = current.split('/').map(Number);
    expect(nextAcademicYear()).toBe(`${start + 1}/${end + 1}`);
  });
});

describe('shiftAcademicYear', () => {
  it('shifts forward and backward by an arbitrary delta', () => {
    expect(shiftAcademicYear('2026/2027', 1)).toBe('2027/2028');
    expect(shiftAcademicYear('2026/2027', -2)).toBe('2024/2025');
    expect(shiftAcademicYear('2026/2027', 0)).toBe('2026/2027');
  });
});
