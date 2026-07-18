// Academic year runs September → August, e.g. Sep 2026–Aug 2027 is "2026/2027"
export function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export function nextAcademicYear(from: string = currentAcademicYear()): string {
  const [start, end] = from.split('/').map(Number);
  return `${start + 1}/${end + 1}`;
}

export function shiftAcademicYear(year: string, delta: number): string {
  const [start, end] = year.split('/').map(Number);
  return `${start + delta}/${end + delta}`;
}
