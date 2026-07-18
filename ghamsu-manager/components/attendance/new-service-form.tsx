'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateService } from '@/lib/hooks/use-attendance';
import { ApiClientError } from '@/lib/api-client';
import type { ServiceType } from '@/lib/types';

const FIELD_CLASS = 'border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground';

export function NewServiceForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [serviceType, setServiceType] = useState<ServiceType>('sunday_service');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const create = useCreateService();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await create.mutateAsync({ service_date: serviceDate, service_type: serviceType, title: title || null });
      onDone();
      router.push(`/attendance/${res.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Date
          <input type="date" className={FIELD_CLASS} value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
        </label>
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Type
          <select className={FIELD_CLASS} value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
            <option value="sunday_service">Sunday service</option>
            <option value="midweek">Midweek</option>
            <option value="special">Special</option>
          </select>
        </label>
      </div>
      <label className="text-sm flex flex-col gap-1 text-foreground">
        Title (optional)
        <input className={FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Homecoming service" />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={create.isPending} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50">
          {create.isPending ? 'Creating…' : 'Start check-in'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
