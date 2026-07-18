'use client';
import { useWings } from '@/lib/hooks/use-wings-classes';
import type { MemberFilters } from '@/lib/hooks/use-members';

const STATUSES = ['prospective', 'active', 'executive', 'associate'];
const LEVELS = [100, 200, 300, 400, 500, 600];

const FIELD_CLASS = 'border border-border rounded-lg px-3 py-1.5 text-sm bg-input-background text-foreground';

export function MemberFiltersBar({
  filters, onChange,
}: {
  filters: MemberFilters;
  onChange: (next: MemberFilters) => void;
}) {
  const { data: wings } = useWings();

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        className={`${FIELD_CLASS} w-full sm:w-56`}
        placeholder="Search by name…"
        value={filters.q ?? ''}
        onChange={(e) => onChange({ ...filters, q: e.target.value || undefined })}
      />
      <select
        className={FIELD_CLASS}
        value={filters.status ?? ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        className={FIELD_CLASS}
        value={filters.wing_id ?? ''}
        onChange={(e) => onChange({ ...filters, wing_id: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">All wings</option>
        {wings?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <select
        className={FIELD_CLASS}
        value={filters.level ?? ''}
        onChange={(e) => onChange({ ...filters, level: e.target.value ? Number(e.target.value) : undefined })}
      >
        <option value="">All levels</option>
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
  );
}
