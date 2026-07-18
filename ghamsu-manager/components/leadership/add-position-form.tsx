'use client';
import { useState } from 'react';
import { useCreatePosition } from '@/lib/hooks/use-leadership';
import { useWings } from '@/lib/hooks/use-wings-classes';
import type { Role, PositionScope } from '@/lib/types';

export function AddPositionForm({ role, onDone }: { role: Role; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<PositionScope>(role === 'national_president' ? 'national' : 'local');
  const [wingId, setWingId] = useState('');
  const [error, setError] = useState('');
  const { data: wings } = useWings();
  const createPosition = useCreatePosition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (scope === 'wing' && !wingId) { setError('Choose a wing'); return; }
    try {
      await createPosition.mutateAsync({ title, scope, wing_id: scope === 'wing' ? Number(wingId) : null });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <input
        className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
        placeholder="Position title (e.g. National Secretary)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      {role === 'local_president' && (
        <div className="flex items-center gap-2">
          <select
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
            value={scope}
            onChange={(e) => setScope(e.target.value as PositionScope)}
          >
            <option value="local">Local</option>
            <option value="wing">Wing</option>
          </select>
          {scope === 'wing' && (
            <select
              className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
              value={wingId}
              onChange={(e) => setWingId(e.target.value)}
            >
              <option value="">Choose wing…</option>
              {wings?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={createPosition.isPending} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50">
          {createPosition.isPending ? 'Creating…' : 'Create position'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
