'use client';
import { useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { useLocalAnalytics, useRemindAbsentees } from '@/lib/hooks/use-attendance-analytics';
import { ApiClientError } from '@/lib/api-client';
import { TrendChart } from './trend-chart';

export function LocalAnalyticsView() {
  const { data: me } = useMe();
  const [missedThreshold, setMissedThreshold] = useState(3);
  const { data, isLoading, error } = useLocalAnalytics(missedThreshold);
  const remind = useRemindAbsentees();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Not found'}</p>;

  const delta = data.latestService && data.previousService
    ? data.latestService.presentCount - data.previousService.presentCount
    : null;

  const isLocalPresident = me?.activeRole.role === 'local_president';
  const allSelected = data.followUpList.length > 0 && selected.size === data.followUpList.length;

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(data!.followUpList.map((m) => m.id)));
  }

  async function handleRemind() {
    setFeedback('');
    try {
      const res = await remind.mutateAsync(Array.from(selected));
      setFeedback(
        res.status === 'sent'
          ? `Reminder sent to ${res.recipientCount} member(s).`
          : `Reminder drafted — waiting for local president approval (${res.recipientCount} recipient(s)).`,
      );
      setSelected(new Set());
    } catch (err) {
      setFeedback(err instanceof ApiClientError ? err.message : 'Could not send the reminder.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold text-foreground">Latest Sunday</h2>
        {data.latestService ? (
          <>
            <p className="text-3xl font-semibold text-foreground mt-2">
              {data.latestService.presentCount} <span className="text-base font-normal text-muted-foreground">/ {data.eligibleCount}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {data.percentage}% on {data.latestService.service_date}
              {delta !== null && (
                <span className={delta >= 0 ? ' text-chart-4' : ' text-destructive'}>
                  {' '}({delta >= 0 ? '+' : ''}{delta} vs last week)
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">No Sunday services recorded yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold text-foreground mb-3">Last 8 weeks</h2>
        <TrendChart trend={data.trend} />
      </div>

      {data.wingBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">By wing (latest Sunday)</h2>
          <ul className="divide-y divide-border">
            {data.wingBreakdown.map((w) => (
              <li key={w.wing_name} className="py-2 flex items-center justify-between text-sm">
                <span className="text-foreground">{w.wing_name}</span>
                <span className="text-muted-foreground">{w.presentCount} / {w.eligibleCount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="font-semibold text-foreground">Missing {missedThreshold}+ weeks running</h2>
          <select
            className="border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground"
            value={missedThreshold}
            onChange={(e) => { setMissedThreshold(Number(e.target.value)); setSelected(new Set()); }}
          >
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} weeks</option>)}
          </select>
        </div>

        {data.followUpList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has missed {missedThreshold} Sundays in a row.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                Select all
              </label>
              <button
                onClick={handleRemind}
                disabled={selected.size === 0 || remind.isPending}
                className="rounded-lg bg-primary text-white text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {remind.isPending
                  ? 'Sending…'
                  : isLocalPresident
                    ? `Send reminder (${selected.size})`
                    : `Draft reminder (${selected.size})`}
              </button>
            </div>
            <ul className="divide-y divide-border">
              {data.followUpList.map((m) => (
                <li key={m.id} className="py-2 flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleOne(m.id)} />
                  <span className="flex-1 min-w-0 truncate text-foreground">{m.full_name}</span>
                  {!m.email && (
                    <span className="rounded-full bg-destructive/10 text-destructive text-xs px-2 py-0.5 shrink-0">no email</span>
                  )}
                  <span className="text-muted-foreground shrink-0">{m.phone}</span>
                </li>
              ))}
            </ul>
            {feedback && <p className="text-sm text-muted-foreground mt-2">{feedback}</p>}
          </>
        )}
      </div>
    </div>
  );
}
