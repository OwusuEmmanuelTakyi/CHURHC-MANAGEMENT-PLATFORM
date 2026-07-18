'use client';
import { useState } from 'react';
import {
  useRegistrationQueue, useApproveRegistration, useRejectRegistration,
} from '@/lib/hooks/use-registration-queue';
import type { MemberRegistration } from '@/lib/types';

function QueueRow({ reg }: { reg: MemberRegistration }) {
  const [mode, setMode] = useState<'create' | 'merge'>(reg.matched_member_id ? 'merge' : 'create');
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const busy = approve.isPending || reject.isPending;

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{reg.full_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reg.phone} · {reg.email ?? 'no email'} · Level {reg.level}
          </p>
        </div>
        {reg.matched_member_id && (
          <span className="rounded-full bg-chart-5/15 text-chart-5 text-xs font-medium px-2 py-0.5 whitespace-nowrap">
            Possible duplicate
          </span>
        )}
      </div>

      {reg.matched_member_id && (
        <p className="text-xs text-muted-foreground mt-2">
          Matches existing member: <span className="text-foreground">{reg.matched_member_name}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {reg.matched_member_id && (
          <select
            className="border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'create' | 'merge')}
          >
            <option value="merge">Update existing member</option>
            <option value="create">Create as new member anyway</option>
          </select>
        )}
        <button
          onClick={() => approve.mutate({ id: reg.id, mode })}
          disabled={busy}
          className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => reject.mutate(reg.id)}
          disabled={busy}
          className="rounded-lg border border-border text-destructive text-sm px-3 py-1.5 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </li>
  );
}

export function ReviewQueue() {
  const { data: registrations, isLoading, error } = useRegistrationQueue();

  return (
    <div>
      <h2 className="font-semibold text-foreground mb-3">Pending registrations</h2>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {registrations && registrations.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
      )}

      {registrations && registrations.length > 0 && (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {registrations.map((reg) => <QueueRow key={reg.id} reg={reg} />)}
        </ul>
      )}
    </div>
  );
}
