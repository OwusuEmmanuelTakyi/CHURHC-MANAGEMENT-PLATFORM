'use client';
import { useWings, useClasses } from '@/lib/hooks/use-wings-classes';
import { useLocals } from '@/lib/hooks/use-locals';
import type { AudienceFilterValue, AudienceType, Role } from '@/lib/types';

const FIELD_CLASS = 'border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground';

export function AudiencePicker({
  role, value, onChange,
}: {
  role: Role;
  value: AudienceFilterValue;
  onChange: (next: AudienceFilterValue) => void;
}) {
  const { data: wings } = useWings();
  const { data: classes } = useClasses();
  const { data: locals } = useLocals();

  return (
    <div className="flex flex-col gap-2">
      <select
        className={FIELD_CLASS}
        value={value.type}
        onChange={(e) => onChange({ type: e.target.value as AudienceType, ids: [] })}
      >
        <option value="all">Everyone in scope</option>
        {role === 'national_president' && <option value="local">Specific local(s)</option>}
        <option value="wing">A wing</option>
        <option value="class">A class</option>
        <option value="executives">Executives</option>
      </select>

      {value.type === 'local' && role === 'national_president' && (
        <select
          multiple
          className={`${FIELD_CLASS} h-24`}
          value={value.ids.map(String)}
          onChange={(e) => onChange({ ...value, ids: Array.from(e.target.selectedOptions, (o) => Number(o.value)) })}
        >
          {locals?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}

      {value.type === 'wing' && (
        <select
          className={FIELD_CLASS}
          value={value.ids[0] ?? ''}
          onChange={(e) => onChange({ ...value, ids: e.target.value ? [Number(e.target.value)] : [] })}
        >
          <option value="">Choose wing…</option>
          {wings?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      )}

      {value.type === 'class' && (
        <select
          className={FIELD_CLASS}
          value={value.ids[0] ?? ''}
          onChange={(e) => onChange({ ...value, ids: e.target.value ? [Number(e.target.value)] : [] })}
        >
          <option value="">Choose class…</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}
