'use client';
import { useState } from 'react';

export function AddItemForm({
  placeholder, busy, onAdd,
}: {
  placeholder: string;
  busy?: boolean;
  onAdd: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError('');
    try {
      await onAdd(value.trim());
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
      <input
        className="flex-1 border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg px-3 py-1 text-sm bg-primary text-white disabled:opacity-50"
      >
        Add
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
