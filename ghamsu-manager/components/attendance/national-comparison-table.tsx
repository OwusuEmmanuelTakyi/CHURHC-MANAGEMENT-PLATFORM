'use client';
import { useNationalAnalytics } from '@/lib/hooks/use-attendance-analytics';

export function NationalComparisonTable() {
  const { data, isLoading, error } = useNationalAnalytics();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">No locals found.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Local</th>
            <th className="px-3 py-2 font-medium">Latest Sunday</th>
            <th className="px-3 py-2 font-medium">Present</th>
            <th className="px-3 py-2 font-medium">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr key={row.local_id}>
              <td className="px-3 py-2 text-foreground whitespace-nowrap">{row.local_name}</td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.latestServiceDate ?? 'No service'}</td>
              <td className="px-3 py-2 text-foreground">{row.presentCount} / {row.eligibleCount}</td>
              <td className="px-3 py-2 text-foreground">{row.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
