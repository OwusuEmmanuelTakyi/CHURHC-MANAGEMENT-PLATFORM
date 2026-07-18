import { formatGHS } from '@/lib/currency';
import type { Contribution } from '@/lib/types';

export function HistoryTable({ contributions }: { contributions: Contribution[] }) {
  if (contributions.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No payments recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Member</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Semester</th>
            <th className="px-3 py-2 font-medium">Paid at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {contributions.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2 whitespace-nowrap text-foreground">{c.members?.full_name ?? '—'}</td>
              <td className="px-3 py-2 text-foreground">{formatGHS(c.amount_pesewas)}</td>
              <td className="px-3 py-2 text-muted-foreground capitalize">
                {c.payment_method}{c.momo_reference ? ` · ${c.momo_reference}` : ''}
              </td>
              <td className="px-3 py-2 text-muted-foreground capitalize">{c.semester}</td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{c.paid_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
