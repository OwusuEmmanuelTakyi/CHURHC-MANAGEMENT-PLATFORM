export function normalizeGhPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');            // strip spaces, dashes, +
  if (/^0\d{9}$/.test(d))   return `+233${d.slice(1)}`;  // 0244123456
  if (/^233\d{9}$/.test(d)) return `+${d}`;              // 233244123456
  if (/^\d{9}$/.test(d))    return `+233${d}`;           // 244123456
  return null;                                  // anything else is invalid
}