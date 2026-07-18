import { Resend } from 'resend';
import { db } from './supabase/server';
import { resolveAudience, type AudienceFilter } from './email-audience';
import { renderAnnouncementEmail } from './email-template';

const CHUNK_SIZE = 100; // Resend batch-send limit

export async function sendBlast(blastId: number) {
  const { data: blast } = await db.from('email_blasts').select('*').eq('id', blastId).single();
  if (!blast) throw new Error('Blast not found');

  const scope = { national: blast.local_id === null, localId: blast.local_id };
  const { recipients, skippedCount } = await resolveAudience(scope, blast.audience_filter as AudienceFilter);

  let localName = 'GHAMSU National';
  if (blast.local_id) {
    const { data: local } = await db.from('locals').select('name').eq('id', blast.local_id).single();
    if (local) localName = local.name;
  }

  const { html, text } = await renderAnnouncementEmail({
    subject: blast.subject, bodyHtml: blast.body_html, localName,
  });

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const reportRows: {
    blast_id: number; member_id: number; email_address: string;
    status: string; provider_message_id: string | null;
  }[] = [];
  let anyChunkFailed = false;

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const result = await resend.batch.send(
      chunk.map((r) => ({ from: process.env.EMAIL_FROM!, to: r.email, subject: blast.subject, html, text })),
    );

    if (result.error || !result.data) {
      anyChunkFailed = true;
      continue;
    }
    const ids = result.data.data;
    chunk.forEach((r, idx) => {
      reportRows.push({
        blast_id: blastId, member_id: r.member_id, email_address: r.email,
        status: 'sent', provider_message_id: ids[idx]?.id ?? null,
      });
    });
  }

  for (let i = 0; i < reportRows.length; i += 500) {
    await db.from('email_delivery_reports').insert(reportRows.slice(i, i + 500));
  }

  const status = reportRows.length === 0 && anyChunkFailed ? 'failed' : 'sent';
  await db.from('email_blasts').update({
    status, sent_at: new Date().toISOString(),
    recipient_count: recipients.length, skipped_count: skippedCount,
  }).eq('id', blastId);

  return { recipientCount: recipients.length, skippedCount, sentCount: reportRows.length, status };
}
