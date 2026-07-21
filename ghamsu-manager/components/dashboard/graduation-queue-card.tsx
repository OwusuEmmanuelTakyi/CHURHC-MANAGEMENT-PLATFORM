'use client';
import { useGraduationQueue } from '@/lib/hooks/use-graduation-queue';

export function GraduationQueueCard() {
  const { data, isLoading, error } = useGraduationQueue();

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Associates queue</h2>
        {!isLoading && !error && (
          <span className="rounded-full bg-accent/20 text-primary text-xs font-medium px-2 py-0.5">
            {data?.count ?? 0}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Active/executive members past their expected graduation date.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground mt-3">Loading…</p>}
      {error && <p className="text-sm text-destructive mt-3">{(error as Error).message}</p>}

      {data && data.members.length === 0 && (
        <p className="text-sm text-muted-foreground mt-3">Nobody is overdue — nice.</p>
      )}

      {data && data.members.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {data.members.slice(0, 8).map((m) => (
            <li key={m.id} className="py-2 flex items-center justify-between text-sm">
              <span className="truncate text-foreground">{m.full_name}</span>
              <span className="text-muted-foreground shrink-0 ml-2">{m.expected_graduation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
