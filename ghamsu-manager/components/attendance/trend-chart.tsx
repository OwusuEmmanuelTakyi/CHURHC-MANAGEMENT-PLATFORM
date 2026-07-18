import type { SundayTrendPoint } from '@/lib/types';

const CHART_HEIGHT = 140;

function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function TrendChart({ trend }: { trend: SundayTrendPoint[] }) {
  if (trend.length === 0) {
    return <p className="text-sm text-muted-foreground">No Sunday services recorded yet.</p>;
  }

  const max = Math.max(1, ...trend.map((t) => t.presentCount));

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {trend.map((t) => {
          const heightPx = Math.round((t.presentCount / max) * (CHART_HEIGHT - 20));
          return (
            <div key={t.service_date} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <span className="text-xs text-foreground mb-1">{t.presentCount}</span>
              <div
                title={`${t.service_date}: ${t.presentCount} present`}
                className="w-full max-w-6 bg-chart-1 rounded-t"
                style={{ height: Math.max(heightPx, 2) }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 border-t border-border mt-1 pt-1">
        {trend.map((t) => (
          <span key={t.service_date} className="flex-1 text-center text-xs text-muted-foreground truncate">
            {shortDate(t.service_date)}
          </span>
        ))}
      </div>
    </div>
  );
}
