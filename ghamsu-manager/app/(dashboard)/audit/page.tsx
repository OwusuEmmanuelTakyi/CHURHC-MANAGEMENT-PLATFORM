'use client';
import { useAuditFeed } from '@/lib/hooks/use-audit';

export default function AuditPage() {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuditFeed();
  const logs = data?.pages.flatMap((p) => p.logs) ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-foreground mb-4">Audit log</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {logs.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      )}

      {logs.length > 0 && (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{log.action}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {log.executives?.name ?? 'Unknown'} · {log.entity_type} #{log.entity_id}
              </p>
              {log.metadata && (
                <pre className="mt-1 text-xs text-muted-foreground bg-secondary rounded-lg px-2 py-1 overflow-x-auto">
                  {JSON.stringify(log.metadata)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-lg border border-border text-foreground px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
