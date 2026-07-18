'use client';
import { useState } from 'react';
import { useMemberSearch } from '@/lib/hooks/use-members';

export function MemberPicker({
  selectedName, onSelect, onClear,
}: {
  selectedName: string | null;
  onSelect: (memberId: number, name: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useMemberSearch(query);

  if (selectedName) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-foreground">{selectedName}</span>
        <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className="border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground w-48"
        placeholder="Search member…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-64 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!isFetching && results?.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
          )}
          {results?.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onSelect(m.id, m.full_name); setQuery(''); }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 text-foreground"
            >
              {m.full_name} <span className="text-muted-foreground text-xs">{m.student_id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
