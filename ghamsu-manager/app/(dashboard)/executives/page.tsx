'use client';
import { useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { CreateExecutiveForm } from '@/components/executives/create-executive-form';
import { ExecutivesList } from '@/components/executives/executives-list';

export default function ExecutivesPage() {
  const { data: me, isLoading, error } = useMe();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !me) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Unable to load your account'}</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-foreground">Executives</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
          New executive
        </button>
      </div>

      {showForm && (
        <div className="mb-4">
          <CreateExecutiveForm me={me} onDone={() => setShowForm(false)} />
        </div>
      )}

      <ExecutivesList me={me} />
    </div>
  );
}
