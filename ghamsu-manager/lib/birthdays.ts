function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// dateOfBirth is a plain 'YYYY-MM-DD' string (as PostgREST returns a DATE
// column) — parsed by splitting, never via `new Date()`, so there's no
// timezone ambiguity around month/day.
function monthDayOf(dateOfBirth: string): { month: number; day: number } {
  const [, moStr, dayStr] = dateOfBirth.split('-');
  return { month: Number(moStr), day: Number(dayStr) };
}

// Feb 29 birthdays celebrate on Feb 28 in years that aren't leap years.
export function matchesMonthDay(dateOfBirth: string, targetMonth: number, targetDay: number, targetYear: number): boolean {
  const { month, day } = monthDayOf(dateOfBirth);
  if (month === targetMonth && day === targetDay) return true;
  if (month === 2 && day === 29 && !isLeapYear(targetYear) && targetMonth === 2 && targetDay === 28) return true;
  return false;
}

export function isBirthdayToday(dateOfBirth: string, today: Date = new Date()): boolean {
  return matchesMonthDay(dateOfBirth, today.getUTCMonth() + 1, today.getUTCDate(), today.getUTCFullYear());
}

// Returns how many days from `from` until the next occurrence of this birthday,
// within the given window (inclusive of today, offset 0) — or null if it
// doesn't fall within that window at all.
export function daysUntilNextBirthday(dateOfBirth: string, from: Date = new Date(), withinDays = 6): number | null {
  for (let offset = 0; offset <= withinDays; offset++) {
    const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + offset));
    if (matchesMonthDay(dateOfBirth, target.getUTCMonth() + 1, target.getUTCDate(), target.getUTCFullYear())) {
      return offset;
    }
  }
  return null;
}

// Backward-looking counterpart used by the Monday weekly-analysis email — did
// this birthday fall anywhere in the 7 days ending on `weekEnd` (inclusive)?
export function hadBirthdayInPastWeek(dateOfBirth: string, weekEnd: Date, daysBack = 6): boolean {
  for (let offset = 0; offset <= daysBack; offset++) {
    const target = new Date(Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), weekEnd.getUTCDate() - offset));
    if (matchesMonthDay(dateOfBirth, target.getUTCMonth() + 1, target.getUTCDate(), target.getUTCFullYear())) {
      return true;
    }
  }
  return false;
}
