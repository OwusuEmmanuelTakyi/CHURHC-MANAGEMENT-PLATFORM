'use client';
import { useState } from 'react';
import { useBlastDetail, useSubmitBlast, useSendBlast, useApproveBlast } from '@/lib/hooks/use-email';
import { BlastStatusBadge } from './blast-status-badge';
import type { Role } from '@/lib/types';

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Everyone in scope',
  local: 'Specific local(s)',
  wing: 'A wing',
  class: 'A class',
  executives: 'Executives',
};

export function BlastDetailDrawer({
  blastId, role, onClose,
}: {
  blastId: number;
  role: Role;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useBlastDetail(blastId);
  const submitBlast = useSubmitBlast();
  const sendBlast = useSendBlast();
  const approveBlast = useApproveBlast();
  const [message, setMessage] = useState('');

  const busy = submitBlast.isPending || sendBlast.isPending || approveBlast.isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-card shadow-lg overflow-y-auto p-5">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>

        {isLoading && <p className="text-sm text-muted-foreground mt-4">Loading…</p>}
        {error && <p className="text-sm text-destructive mt-4">{(error as Error).message}</p>}

        {data && (
          <>
            <div className="mt-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">{data.blast.subject}</h2>
              <BlastStatusBadge status={data.blast.status} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-foreground">
              <div><dt className="text-muted-foreground">Audience</dt><dd>{AUDIENCE_LABELS[data.blast.audience_filter.type]}</dd></div>
              <div><dt className="text-muted-foreground">Recipients</dt><dd>{data.blast.recipient_count}</dd></div>
              <div><dt className="text-muted-foreground">Skipped (no email)</dt><dd>{data.blast.skipped_count}</dd></div>
              <div><dt className="text-muted-foreground">Scheduled</dt><dd>{data.blast.scheduled_at ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Sent at</dt><dd>{data.blast.sent_at ?? '—'}</dd></div>
            </dl>

            <div className="mt-4 rounded-lg bg-secondary p-3 text-sm whitespace-pre-wrap text-foreground">
              {data.blast.body_text}
            </div>

            {Object.keys(data.report).length > 0 && (
              <>
                <h3 className="mt-5 font-semibold text-sm text-foreground">Delivery report</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(data.report).map(([status, count]) => (
                    <div key={status} className="rounded-lg border border-border p-2 text-center">
                      <p className="text-lg font-semibold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground capitalize">{status}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 flex gap-2 flex-wrap">
              {data.blast.status === 'draft' && role === 'secretary' && (
                <button
                  disabled={busy}
                  onClick={async () => { await submitBlast.mutateAsync(blastId); setMessage('Submitted for approval.'); }}
                  className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  Submit for approval
                </button>
              )}
              {data.blast.status === 'draft' && (role === 'national_president' || role === 'local_president') && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const res = await sendBlast.mutateAsync(blastId) as { sent?: boolean; scheduled?: boolean };
                    setMessage(res.scheduled ? 'Scheduled.' : 'Sent.');
                  }}
                  className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  Send now
                </button>
              )}
              {data.blast.status === 'pending_approval' && role === 'local_president' && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const res = await approveBlast.mutateAsync(blastId) as { sent?: boolean; scheduled?: boolean };
                    setMessage(res.scheduled ? 'Approved and scheduled.' : 'Approved and sent.');
                  }}
                  className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  Approve &amp; send
                </button>
              )}
            </div>

            {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
          </>
        )}
      </div>
    </div>
  );
}
