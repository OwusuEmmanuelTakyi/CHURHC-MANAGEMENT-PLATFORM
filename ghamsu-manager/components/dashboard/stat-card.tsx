import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface StatCardTrend {
  direction: 'up' | 'down' | 'flat';
  label: string;
}

export function StatCard({ label, value, note, trend }: {
  label: string;
  value: string;
  note?: string;
  trend?: StatCardTrend;
}) {
  const TrendIcon = trend?.direction === 'up' ? ArrowUp : trend?.direction === 'down' ? ArrowDown : Minus;
  const trendClass = trend?.direction === 'up' ? 'text-chart-4' : trend?.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      {trend && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${trendClass}`}>
          <TrendIcon size={12} />
          {trend.label}
        </p>
      )}
    </div>
  );
}
