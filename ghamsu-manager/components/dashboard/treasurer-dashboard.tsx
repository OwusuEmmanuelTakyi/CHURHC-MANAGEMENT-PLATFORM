'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTreasurerDashboard } from '@/lib/hooks/use-dashboard';
import { formatGHS } from '@/lib/currency';
import { Avatar } from '@/components/shared/avatar';
import { StatCard } from './stat-card';
import { BirthdaysCard } from './birthdays-card';
import { RecordPaymentForm } from '@/components/contributions/record-payment-form';

const CHART_HEIGHT = 140;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function MonthlyIncomeChart({ data }: { data: { label: string; totalPesewas: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.totalPesewas));
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height: CHART_HEIGHT }}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-xs text-foreground mb-1">{formatGHS(d.totalPesewas)}</span>
            <div
              title={`${d.label}: ${formatGHS(d.totalPesewas)}`}
              className="w-full max-w-8 bg-chart-4 rounded-t"
              style={{ height: Math.max(Math.round((d.totalPesewas / max) * (CHART_HEIGHT - 20)), 2) }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3 border-t border-border mt-1 pt-1">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-muted-foreground">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function TreasurerDashboard() {
  const { data, isLoading, error } = useTreasurerDashboard();
  const [showRecordForm, setShowRecordForm] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Failed to load'}</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Dues Collected" value={formatGHS(data.stats.duesCollectedPesewas)} />
        <StatCard label="Members Owing" value={String(data.stats.membersOwingCount)} note="no payment on file this year" />
        <StatCard label="MoMo Payments" value={String(data.stats.momoCount)} />
        <StatCard label="Cash Payments" value={String(data.stats.cashCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">Monthly income</h2>
          <MonthlyIncomeChart data={data.monthlyIncome} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-foreground">Recent payments</h2>
            <button onClick={() => setShowRecordForm((v) => !v)} className="rounded-lg bg-primary text-white text-xs px-2.5 py-1">
              Record
            </button>
          </div>

          {showRecordForm && (
            <div className="mb-3">
              <RecordPaymentForm onDone={() => setShowRecordForm(false)} />
            </div>
          )}

          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentPayments.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <Avatar name={p.member_name} size="sm" />
                  <span className="flex-1 min-w-0 truncate text-foreground">{p.member_name}</span>
                  <span className="font-semibold text-foreground">{formatGHS(p.amount_pesewas)}</span>
                  <span className={`rounded-full text-xs px-2 py-0.5 shrink-0 ${
                    p.payment_method === 'momo' ? 'bg-chart-4/15 text-chart-4' : 'bg-chart-3/15 text-chart-3'
                  }`}>
                    {p.payment_method === 'momo' ? 'MoMo' : 'Cash'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(p.paid_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Members &amp; dues status</h2>
            <p className="text-sm text-muted-foreground mt-1">Read-only member list with a Paid/Owing column.</p>
          </div>
          <Link href="/members" className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5 whitespace-nowrap">
            View members
          </Link>
        </div>
        <BirthdaysCard />
      </div>
    </div>
  );
}
