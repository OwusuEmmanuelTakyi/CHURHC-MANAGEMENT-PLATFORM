import { db } from '@/lib/supabase/server';
import { sendBlast } from '@/lib/email-send';

export interface EmailSchedulerResult {
  blastsSent: number;
  results: { id: number; ok: boolean; error?: string }[];
}

// Atomic claim, no schema change: a due blast only ever reaches status='approved'
// with a non-null scheduled_at (immediate sends skip straight to sendBlast() and
// never sit in 'approved' at all — see the /send and /approve routes). So nulling
// scheduled_at IS the claim: this single UPDATE...WHERE...RETURNING is one SQL
// statement, and Postgres row-locks each matching row, so if two calls overlap,
// the second one's `scheduled_at <= now()` simply won't match rows the first
// already claimed (nulled). status stays 'approved' until sendBlast()'s own
// final update sets 'sent'/'failed' — unchanged, so a crash between claim and
// completion leaves a stuck-but-never-falsely-sent row rather than a double-send.
export async function runEmailScheduler(): Promise<EmailSchedulerResult> {
  const nowIso = new Date().toISOString();

  const { data: claimed, error } = await db.from('email_blasts')
    .update({ scheduled_at: null })
    .eq('status', 'approved')
    .lte('scheduled_at', nowIso)
    .select('id');
  if (error) throw new Error(error.message);

  const results: { id: number; ok: boolean; error?: string }[] = [];
  for (const blast of claimed ?? []) {
    try {
      await sendBlast(blast.id);
      results.push({ id: blast.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`email-scheduler: failed to send blast ${blast.id}: ${message}`);
      await db.from('email_blasts').update({ status: 'failed' }).eq('id', blast.id);
      results.push({ id: blast.id, ok: false, error: message });
    }
  }

  return { blastsSent: results.filter((r) => r.ok).length, results };
}
