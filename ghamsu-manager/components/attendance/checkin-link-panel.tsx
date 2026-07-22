'use client';
import { useState } from 'react';
import { useAttendanceLink, useCreateAttendanceLink, useRevokeAttendanceLink } from '@/lib/hooks/use-attendance';

export function CheckInLinkPanel({ serviceId }: { serviceId: number }) {
  const { data, isLoading } = useAttendanceLink(serviceId);
  const create = useCreateAttendanceLink(serviceId);
  const revoke = useRevokeAttendanceLink(serviceId);
  const [copied, setCopied] = useState(false);

  if (isLoading) return null;

  const url = data?.token && typeof window !== 'undefined' ? `${window.location.origin}/checkin/${data.token}` : null;

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-3">
      <h2 className="text-sm font-semibold text-foreground">Self check-in link</h2>
      <p className="text-xs text-muted-foreground mt-1">
        Share this so attendees can mark themselves present with their student ID — everyone can use the same link at once.
      </p>

      {url ? (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={url}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background text-foreground"
          />
          <div className="flex gap-2 shrink-0">
            <button onClick={copyLink} className="rounded-lg bg-primary text-white text-xs font-medium px-3 py-1.5">
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => revoke.mutate()}
              disabled={revoke.isPending}
              className="rounded-lg border border-destructive/40 text-destructive text-xs px-3 py-1.5 disabled:opacity-50"
            >
              Revoke
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="mt-3 rounded-lg bg-primary text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
        >
          {create.isPending ? 'Generating…' : 'Get check-in link'}
        </button>
      )}
    </div>
  );
}
