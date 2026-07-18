'use client';
import { useEffect, useState } from 'react';
import {
  useEstimateAudience, useCreateBlast, useSubmitBlast, useSendBlast,
} from '@/lib/hooks/use-email';
import { AudiencePicker } from './audience-picker';
import { ApiClientError } from '@/lib/api-client';
import type { AudienceFilterValue, Role } from '@/lib/types';

export function ComposerDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilterValue>({ type: 'all', ids: [] });
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<string>('');

  const estimate = useEstimateAudience();
  const createBlast = useCreateBlast();
  const submitBlast = useSubmitBlast();
  const sendBlast = useSendBlast();

  useEffect(() => {
    const t = setTimeout(() => {
      estimate.mutate(audienceFilter);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceFilter.type, audienceFilter.ids.join(',')]);

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (audienceFilter.type !== 'all' && audienceFilter.type !== 'executives' && audienceFilter.ids.length === 0) {
      setError('Pick who this goes to');
      return;
    }
    try {
      const res = await createBlast.mutateAsync({
        subject, body, audienceFilter,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setCreatedId(res.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong');
    }
  }

  async function handleSubmitForApproval() {
    if (!createdId) return;
    await submitBlast.mutateAsync(createdId);
    setOutcome('Submitted to your local president for approval.');
  }

  async function handleSendNow() {
    if (!createdId) return;
    const res = await sendBlast.mutateAsync(createdId) as { sent?: boolean; scheduled?: boolean; recipientCount?: number };
    setOutcome(res.scheduled ? 'Scheduled — it will go out at the time you picked.' : `Sent to ${res.recipientCount ?? 0} member(s).`);
  }

  const busy = createBlast.isPending || submitBlast.isPending || sendBlast.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-card p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        {!createdId ? (
          <form onSubmit={handleSaveDraft} className="flex flex-col gap-3">
            <h2 className="font-semibold text-lg text-foreground">New announcement</h2>

            <label className="text-sm flex flex-col gap-1 text-foreground">
              Subject
              <input
                className="border border-border rounded-lg px-2 py-1.5 bg-input-background text-foreground"
                value={subject} onChange={(e) => setSubject(e.target.value)} required
              />
            </label>

            <label className="text-sm flex flex-col gap-1 text-foreground">
              Message
              <textarea
                className="border border-border rounded-lg px-2 py-1.5 bg-input-background text-foreground min-h-32"
                value={body} onChange={(e) => setBody(e.target.value)} required
              />
            </label>

            <div className="text-sm text-foreground">
              <p className="mb-1">Audience</p>
              <AudiencePicker role={role} value={audienceFilter} onChange={setAudienceFilter} />
            </div>

            <label className="text-sm flex flex-col gap-1 text-foreground">
              Schedule for later (optional)
              <input
                type="datetime-local"
                className="border border-border rounded-lg px-2 py-1.5 bg-input-background text-foreground"
                value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>

            <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
              {estimate.isPending && <span className="text-muted-foreground">Estimating…</span>}
              {estimate.data && (
                <>
                  <span className="text-foreground font-medium">{estimate.data.recipientCount} recipient(s)</span>
                  {estimate.data.skippedCount > 0 && (
                    <span className="text-destructive font-medium ml-2">
                      {estimate.data.skippedCount} skipped — no email on file
                    </span>
                  )}
                </>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm border border-border text-foreground disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-lg px-3 py-1.5 text-sm bg-primary text-white disabled:opacity-50">
                {createBlast.isPending ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-lg text-foreground">Draft saved</h2>
            {!outcome ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {role === 'secretary'
                    ? 'Submit it to your local president for approval, or leave it as a draft for now.'
                    : 'Send it now, or leave it as a draft for now.'}
                </p>
                <div className="flex gap-2">
                  {role === 'secretary' ? (
                    <button onClick={handleSubmitForApproval} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm bg-primary text-white disabled:opacity-50">
                      Submit for approval
                    </button>
                  ) : (
                    <button onClick={handleSendNow} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm bg-primary text-white disabled:opacity-50">
                      {sendBlast.isPending ? 'Sending…' : 'Send now'}
                    </button>
                  )}
                  <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm border border-border text-foreground">
                    Leave as draft
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{outcome}</p>
                <button onClick={onClose} className="self-start rounded-lg px-3 py-1.5 text-sm bg-primary text-white">
                  Done
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
