'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMe } from '@/lib/hooks/use-me';
import { useLocals, useCreateLocal } from '@/lib/hooks/use-locals';

export default function LocalsPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: locals, isLoading, error } = useLocals();
  const createLocal = useCreateLocal();
  const [showAdd, setShowAdd] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [universityName, setUniversityName] = useState('');

  const isNational = me?.activeRole.role === 'national_president';

  useEffect(() => {
    if (me && !isNational && me.activeRole.localId) {
      router.replace(`/locals/${me.activeRole.localId}`);
    }
  }, [me, isNational, router]);

  if (!me || (!isNational && me.activeRole.localId)) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-foreground">Locals</h1>
        {me.permissions.includes('locals.manage') && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-primary text-white text-sm px-3 py-1.5"
          >
            New local
          </button>
        )}
      </div>

      {showAdd && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
            if (!name || !shortCode.trim() || !universityName.trim()) return;
            await createLocal.mutateAsync({ name, short_code: shortCode.trim(), university_name: universityName.trim() });
            setShowAdd(false);
            setShortCode('');
            setUniversityName('');
            form.reset();
          }}
          className="mb-4 rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
        >
          <input name="name" placeholder="Local name (e.g. GHAMSU Legon)"
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground" required />
          <input value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="Short code (e.g. UG)"
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground" required />
          <input value={universityName} onChange={(e) => setUniversityName(e.target.value)} placeholder="University name"
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground" required />
          <button type="submit" disabled={createLocal.isPending}
            className="self-start rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50">
            {createLocal.isPending ? 'Creating…' : 'Create local'}
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {locals && (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {locals.map((l) => (
            <li key={l.id}>
              <Link href={`/locals/${l.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/60">
                <div>
                  <p className="text-sm font-medium text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.university_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{l.short_code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
