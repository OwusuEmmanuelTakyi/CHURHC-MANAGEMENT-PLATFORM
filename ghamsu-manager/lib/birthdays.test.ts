import { describe, it, expect } from 'vitest';
import { isBirthdayToday, daysUntilNextBirthday, hadBirthdayInPastWeek } from './birthdays';

// All "today" values use Date.UTC directly (not ISO 'Z' strings reparsed) —
// the module reads via getUTCMonth()/getUTCDate(), so this keeps the tests
// deterministic regardless of the machine's local timezone.
describe('isBirthdayToday', () => {
  it('matches an ordinary birthday', () => {
    expect(isBirthdayToday('2001-04-12', new Date(Date.UTC(2026, 3, 12)))).toBe(true);
    expect(isBirthdayToday('2001-04-12', new Date(Date.UTC(2026, 3, 13)))).toBe(false);
  });

  it('celebrates a Feb 29 birthday on Feb 28 in a non-leap year', () => {
    expect(isBirthdayToday('2000-02-29', new Date(Date.UTC(2026, 1, 28)))).toBe(true);
    expect(isBirthdayToday('2000-02-29', new Date(Date.UTC(2026, 1, 27)))).toBe(false);
  });

  it('matches a Feb 29 birthday on Feb 29 itself in a leap year', () => {
    expect(isBirthdayToday('2000-02-29', new Date(Date.UTC(2028, 1, 29)))).toBe(true);
    // and does NOT also fire on Feb 28 of that same leap year
    expect(isBirthdayToday('2000-02-29', new Date(Date.UTC(2028, 1, 28)))).toBe(false);
  });

  it('ignores the birth year', () => {
    expect(isBirthdayToday('1985-11-03', new Date(Date.UTC(2040, 10, 3)))).toBe(true);
  });
});

describe('daysUntilNextBirthday', () => {
  it('returns 0 for a birthday today', () => {
    expect(daysUntilNextBirthday('2001-04-12', new Date(Date.UTC(2026, 3, 12)))).toBe(0);
  });

  it('returns the correct offset within the window', () => {
    expect(daysUntilNextBirthday('2026-04-15', new Date(Date.UTC(2026, 3, 12)))).toBe(3);
  });

  it('returns null outside the window', () => {
    expect(daysUntilNextBirthday('2026-04-25', new Date(Date.UTC(2026, 3, 12)), 6)).toBeNull();
  });

  it('handles a month/year rollover inside the window', () => {
    // Dec 30 + 3 days = Jan 2 — must not break at the year boundary
    expect(daysUntilNextBirthday('1999-01-02', new Date(Date.UTC(2026, 11, 30)))).toBe(3);
  });

  it('respects a custom window size', () => {
    expect(daysUntilNextBirthday('2026-04-20', new Date(Date.UTC(2026, 3, 12)), 6)).toBeNull();
    expect(daysUntilNextBirthday('2026-04-20', new Date(Date.UTC(2026, 3, 12)), 10)).toBe(8);
  });
});

describe('hadBirthdayInPastWeek', () => {
  it('matches a birthday within the trailing 7-day window', () => {
    // week ending Sunday 2026-04-12, birthday on the Wednesday before
    expect(hadBirthdayInPastWeek('2001-04-08', new Date(Date.UTC(2026, 3, 12)))).toBe(true);
  });

  it('does not match a birthday outside the window', () => {
    expect(hadBirthdayInPastWeek('2001-04-01', new Date(Date.UTC(2026, 3, 12)))).toBe(false);
  });

  it('handles a month/year rollover looking backward', () => {
    // week ending Sunday 2027-01-04 should reach back into December
    expect(hadBirthdayInPastWeek('1999-12-30', new Date(Date.UTC(2027, 0, 4)))).toBe(true);
  });
});
