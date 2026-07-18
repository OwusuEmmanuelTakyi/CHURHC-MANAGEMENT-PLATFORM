'use client';
import { useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { useBlasts } from '@/lib/hooks/use-email';
import { BlastStatusBadge } from '@/components/email/blast-status-badge';
import { ComposerDialog } from '@/components/email/composer-dialog';
import { BlastDetailDrawer } from '@/components/email/blast-detail-drawer';

export default function EmailPage() {
  const { data: me } = useMe();
  const { data: blasts, isLoading, error } = useBlasts();
  const [showComposer, setShowComposer] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const canCompose = me?.permissions.some((p) => ['email.send', 'email.draft'].includes(p)) ?? false;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-foreground">Email</h1>
        {canCompose && (
          <button onClick={() => setShowComposer(true)} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
            New announcement
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {blasts && blasts.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}

      {blasts && blasts.length > 0 && (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {blasts.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => setSelectedId(b.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/60"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{b.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.recipient_count} recipient(s){b.skipped_count > 0 ? ` · ${b.skipped_count} skipped` : ''}
                  </p>
                </div>
                <BlastStatusBadge status={b.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showComposer && me && (
        <ComposerDialog role={me.activeRole.role} onClose={() => setShowComposer(false)} />
      )}

      {selectedId !== null && me && (
        <BlastDetailDrawer blastId={selectedId} role={me.activeRole.role} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
