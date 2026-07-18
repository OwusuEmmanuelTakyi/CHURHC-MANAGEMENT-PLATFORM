'use client';
import { useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { useLeadershipPositions } from '@/lib/hooks/use-leadership';
import { currentAcademicYear } from '@/lib/academic-year';
import { PositionRow } from '@/components/leadership/position-row';
import { AddPositionForm } from '@/components/leadership/add-position-form';
import { HandoverDialog } from '@/components/leadership/handover-dialog';

export default function LeadershipPage() {
  const { data: me } = useMe();
  const [year, setYear] = useState(currentAcademicYear());
  const { data, isLoading, error } = useLeadershipPositions(year);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHandover, setShowHandover] = useState(false);

  const isCurrentYear = year === currentAcademicYear();
  const canManage = me?.permissions.includes('leadership.admin') ?? false;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-semibold text-foreground">Leadership</h1>
        <div className="flex items-center gap-2">
          <select
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {(data?.availableYears ?? [year]).map((y) => (
              <option key={y} value={y}>{y}{y === currentAcademicYear() ? ' (current)' : ''}</option>
            ))}
          </select>
          {isCurrentYear && canManage && (
            <>
              <button onClick={() => setShowAddForm((v) => !v)} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
                New position
              </button>
              <button onClick={() => setShowHandover(true)} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
                Start new term
              </button>
            </>
          )}
        </div>
      </div>

      {showAddForm && me && (
        <div className="mb-4">
          <AddPositionForm role={me.activeRole.role} onDone={() => setShowAddForm(false)} />
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          {data.positions.length === 0 && <p className="text-sm text-muted-foreground">No positions yet.</p>}
          <ul className="divide-y divide-border">
            {data.positions.map((p) => (
              <PositionRow key={p.id} position={p} isCurrentYear={isCurrentYear} canManage={canManage} />
            ))}
          </ul>
        </div>
      )}

      {showHandover && data && (
        <HandoverDialog positions={data.positions} onClose={() => setShowHandover(false)} />
      )}
    </div>
  );
}
