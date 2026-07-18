import { db } from './supabase/server';

const RATE_LIMIT_PER_HOUR = 5;

function currentHourWindow(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

// Basic per-IP hourly counter — a small race window between the read and the
// write is an accepted tradeoff for a "basic" limiter on a public form with no
// auth to key off instead.
export async function checkAndIncrementIpLimit(ip: string, limit = RATE_LIMIT_PER_HOUR): Promise<boolean> {
  const windowHour = currentHourWindow();

  const { error: insertError } = await db.from('registration_rate_limits')
    .insert({ ip, window_hour: windowHour, count: 1 });
  if (!insertError) return true; // first submission from this IP this hour

  const { data: existing } = await db.from('registration_rate_limits')
    .select('count').eq('ip', ip).eq('window_hour', windowHour).single();
  if (!existing || existing.count >= limit) return false;

  await db.from('registration_rate_limits')
    .update({ count: existing.count + 1 }).eq('ip', ip).eq('window_hour', windowHour);
  return true;
}
