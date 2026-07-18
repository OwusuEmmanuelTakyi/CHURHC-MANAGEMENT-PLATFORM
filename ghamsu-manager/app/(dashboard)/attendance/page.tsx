'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/lib/hooks/use-me';
import { useServices } from '@/lib/hooks/use-attendance';
import { NewServiceForm } from '@/components/attendance/new-service-form';

const TYPE_LABELS: Record<string, string> = {
  sunday_service: 'Sunday service',
  midweek: 'Midweek',
  special: 'Special',
};

export default function AttendancePage() {
  const { data: me } = useMe();
  const { data: services, isLoading, error } = useServices();
  const [showForm, setShowForm] = useState(false);

  const canTake = me?.permissions.includes('attendance.take') ?? false;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-foreground">Attendance</h1>
        <div className="flex items-center gap-2">
          <Link href="/attendance/analytics" className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
            Analytics
          </Link>
          {canTake && (
            <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
              New service
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewServiceForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {services && services.length === 0 && <p className="text-sm text-muted-foreground">No services recorded yet.</p>}

      {services && services.length > 0 && (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {services.map((s) => (
            <li key={s.id}>
              <Link href={`/attendance/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/60">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {s.service_date} · {TYPE_LABELS[s.service_type]}
                  </p>
                  {s.title && <p className="text-xs text-muted-foreground mt-0.5">{s.title}</p>}
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {s.presentCount} / {s.eligibleCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
