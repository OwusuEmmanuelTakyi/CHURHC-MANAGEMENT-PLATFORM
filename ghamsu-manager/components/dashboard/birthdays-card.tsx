'use client';
import { useBirthdaysThisWeek } from '@/lib/hooks/use-birthdays';

function dayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today!';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

export function BirthdaysCard() {
  const { data, isLoading, error } = useBirthdaysThisWeek();

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Birthdays this week</h2>
        {!isLoading && !error && (
          <span className="rounded-full bg-accent/20 text-primary text-xs font-medium px-2 py-0.5">
            {data?.length ?? 0}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Members with a birthday in the next 7 days.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground mt-3">Loading…</p>}
      {error && <p className="text-sm text-destructive mt-3">{(error as Error).message}</p>}

      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground mt-3">No birthdays coming up this week.</p>
      )}

      {data && data.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {data.slice(0, 8).map((m) => (
            <li key={m.id} className="py-2 flex items-center justify-between text-sm">
              <span className="truncate text-foreground">{m.full_name}</span>
              <span className={`shrink-0 ml-2 ${m.daysUntil === 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {dayLabel(m.daysUntil)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
