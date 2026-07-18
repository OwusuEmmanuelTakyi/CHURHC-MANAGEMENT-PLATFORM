import { formatGHS } from '@/lib/currency';
import type { ContributionsSummary } from '@/lib/types';

const SEMESTERS = ['first', 'second'] as const;
const METHODS = ['momo', 'cash'] as const;

export function SummaryCards({ summary }: { summary: ContributionsSummary }) {
  const totalPesewasBySemester = (semester: string) =>
    summary.totals.filter((t) => t.semester === semester).reduce((sum, t) => sum + t.totalPesewas, 0);

  const methodTotal = (semester: string, method: string) =>
    summary.totals.filter((t) => t.semester === semester && t.payment_method === method)
      .reduce((sum, t) => sum + t.totalPesewas, 0);

  const duesFor = (semester: string) => {
    const rows = summary.duesStatus.filter((d) => d.semester === semester);
    return {
      paid: rows.reduce((sum, d) => sum + d.paidCount, 0),
      unpaid: rows.reduce((sum, d) => sum + d.unpaidCount, 0),
    };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {SEMESTERS.map((semester) => {
        const dues = duesFor(semester);
        return (
          <div key={semester} className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground capitalize">{semester} semester</h3>
            <p className="text-2xl font-semibold text-foreground mt-2">{formatGHS(totalPesewasBySemester(semester))}</p>
            <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
              {METHODS.map((m) => (
                <span key={m} className="capitalize">{m}: {formatGHS(methodTotal(semester, m))}</span>
              ))}
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              <span className="rounded-full bg-chart-4/15 text-chart-4 px-2 py-0.5">{dues.paid} paid</span>
              <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5">{dues.unpaid} unpaid</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
