'use client';
import { useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { useContributions, useContributionsSummary } from '@/lib/hooks/use-contributions';
import { currentAcademicYear } from '@/lib/academic-year';
import { SummaryCards } from '@/components/contributions/summary-cards';
import { HistoryTable } from '@/components/contributions/history-table';
import { RecordPaymentForm } from '@/components/contributions/record-payment-form';

export default function ContributionsPage() {
  const { data: me } = useMe();
  const [year] = useState(currentAcademicYear());
  const [semester, setSemester] = useState('');
  const [showRecordForm, setShowRecordForm] = useState(false);

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useContributionsSummary(year);

  const canRecord = me?.permissions.includes('contributions.record') ?? false;
  const canExport = me?.permissions.includes('contributions.export') ?? false;
  const canViewHistory = me?.activeRole.role === 'treasurer' || me?.activeRole.role === 'local_president';

  const { data: contributions, isLoading: historyLoading, error: historyError } = useContributions(
    canViewHistory ? { academic_year: year, semester: semester || undefined } : {},
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-semibold text-foreground">Contributions — {year}</h1>
        <div className="flex items-center gap-2">
          {canExport && (
            <a
              href={`/api/contributions/export?academic_year=${encodeURIComponent(year)}${semester ? `&semester=${semester}` : ''}`}
              className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5"
            >
              Export CSV
            </a>
          )}
          {canRecord && (
            <button onClick={() => setShowRecordForm((v) => !v)} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
              Record payment
            </button>
          )}
        </div>
      </div>

      {showRecordForm && (
        <div className="mb-4">
          <RecordPaymentForm onDone={() => setShowRecordForm(false)} />
        </div>
      )}

      {summaryLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {summaryError && <p className="text-sm text-destructive">{(summaryError as Error).message}</p>}
      {summary && <SummaryCards summary={summary} />}

      {canViewHistory && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-foreground">Payment history</h2>
            <select
              className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">Both semesters</option>
              <option value="first">First</option>
              <option value="second">Second</option>
            </select>
          </div>

          {historyLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {historyError && <p className="text-sm text-destructive">{(historyError as Error).message}</p>}
          {contributions && <HistoryTable contributions={contributions} />}
        </div>
      )}
    </div>
  );
}
