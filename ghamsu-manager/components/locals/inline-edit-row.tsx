'use client';
import { useState } from 'react';

export function InlineEditRow({
  name, memberCount, editable, busy, onSave,
}: {
  name: string;
  memberCount: number;
  editable: boolean;
  busy?: boolean;
  onSave: (name: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2">
        <input
          className="flex-1 border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button
          disabled={busy}
          onClick={async () => { await onSave(value); setEditing(false); }}
          className="text-sm text-primary disabled:opacity-50"
        >
          Save
        </button>
        <button
          disabled={busy}
          onClick={() => { setValue(name); setEditing(false); }}
          className="text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span className="text-foreground">{name}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{memberCount} member{memberCount === 1 ? '' : 's'}</span>
        {editable && (
          <button onClick={() => setEditing(true)} className="text-primary text-xs font-medium">
            Rename
          </button>
        )}
      </div>
    </li>
  );
}
