'use client';
import { useState } from 'react';
import { useHandover } from '@/lib/hooks/use-leadership';
import { nextAcademicYear } from '@/lib/academic-year';
import { MemberPicker } from '@/components/shared/member-picker';
import type { LeadershipPosition, HandoverResult } from '@/lib/types';

type Picks = Record<number, { memberId: number; memberName: string } | null>;

export function HandoverDialog({
  positions, onClose,
}: {
  positions: LeadershipPosition[];
  onClose: () => void;
}) {
  const [picks, setPicks] = useState<Picks>(() => {
    const initial: Picks = {};
    for (const p of positions) {
      initial[p.id] = p.assignment && !p.assignment.end_date
        ? { memberId: p.assignment.member_id, memberName: p.assignment.member_name }
        : null;
    }
    return initial;
  });
  const [result, setResult] = useState<HandoverResult | null>(null);
  const [error, setError] = useState('');
  const handover = useHandover();
  const newYear = nextAcademicYear();

  async function handleSubmit() {
    setError('');
    const assignments = Object.entries(picks)
      .filter(([, v]) => v !== null)
      .map(([positionId, v]) => ({ position_id: Number(positionId), member_id: v!.memberId }));

    if (assignments.length === 0) { setError('Pick at least one member to carry the handover'); return; }

    try {
      const res = await handover.mutateAsync(assignments);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handover failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-card p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        {!result ? (
          <>
            <h2 className="font-semibold text-lg text-foreground">Start new term — {newYear}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Every current holder shown below is pre-filled. Change who should hold each position next
              year, or clear one to leave it vacant. This ends all current terms in this scope and starts
              the new academic year atomically.
            </p>

            <ul className="mt-4 divide-y divide-border">
              {positions.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{p.title}</span>
                  <MemberPicker
                    selectedName={picks[p.id]?.memberName ?? null}
                    onSelect={(memberId, memberName) => setPicks((cur) => ({ ...cur, [p.id]: { memberId, memberName } }))}
                    onClear={() => setPicks((cur) => ({ ...cur, [p.id]: null }))}
                  />
                </li>
              ))}
            </ul>

            {error && <p className="text-sm text-destructive mt-3">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} disabled={handover.isPending} className="rounded-lg px-3 py-1.5 text-sm border border-border text-foreground disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={handover.isPending} className="rounded-lg px-3 py-1.5 text-sm bg-primary text-white disabled:opacity-50">
                {handover.isPending ? 'Processing…' : 'Confirm handover'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-lg text-foreground">Handover complete</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {result.endedCount} term(s) ended, {result.createdCount} assignment(s) created for {result.newAcademicYear}.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm bg-primary text-white">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
