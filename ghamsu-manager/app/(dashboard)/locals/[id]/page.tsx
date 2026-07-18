'use client';
import { use, useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import {
  useLocalDetail, useUpdateLocal, useCreateWing, useUpdateWing, useCreateClass, useUpdateClass,
} from '@/lib/hooks/use-locals';
import { InlineEditRow } from '@/components/locals/inline-edit-row';
import { AddItemForm } from '@/components/locals/add-item-form';

export default function LocalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const localId = Number(id);

  const { data: me } = useMe();
  const { data, isLoading, error } = useLocalDetail(localId);
  const updateLocal = useUpdateLocal(localId);
  const createWing = useCreateWing(localId);
  const updateWing = useUpdateWing(localId);
  const createClass = useCreateClass(localId);
  const updateClass = useUpdateClass(localId);

  const [editingLocal, setEditingLocal] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [universityDraft, setUniversityDraft] = useState('');

  const canManageLocal = me?.permissions.includes('locals.manage') ?? false;
  const canManageWings = me?.permissions.includes('wings.manage') ?? false;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Not found'}</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        {!editingLocal ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{data.local.name}</h1>
              <p className="text-sm text-muted-foreground">{data.local.university_name} · {data.local.short_code}</p>
              {!data.local.active && (
                <span className="inline-block mt-1 rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">
                  Inactive
                </span>
              )}
            </div>
            {canManageLocal && (
              <button
                onClick={() => {
                  setNameDraft(data.local.name);
                  setUniversityDraft(data.local.university_name);
                  setEditingLocal(true);
                }}
                className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5"
              >
                Edit
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
              value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Name" />
            <input className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
              value={universityDraft} onChange={(e) => setUniversityDraft(e.target.value)} placeholder="University name" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={data.local.active} onChange={async (e) => {
                await updateLocal.mutateAsync({ active: e.target.checked });
              }} />
              Active
            </label>
            <div className="flex gap-2">
              <button
                disabled={updateLocal.isPending}
                onClick={async () => {
                  await updateLocal.mutateAsync({ name: nameDraft, university_name: universityDraft });
                  setEditingLocal(false);
                }}
                className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={() => setEditingLocal(false)} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold text-foreground">Wings</h2>
        <ul className="mt-2 divide-y divide-border">
          {data.wings.length === 0 && <p className="text-sm text-muted-foreground py-2">No wings yet.</p>}
          {data.wings.map((w) => (
            <InlineEditRow
              key={w.id}
              name={w.name}
              memberCount={w.memberCount}
              editable={canManageWings}
              busy={updateWing.isPending}
              onSave={(name) => updateWing.mutateAsync({ id: w.id, name })}
            />
          ))}
        </ul>
        {canManageWings && (
          <AddItemForm placeholder="New wing name" busy={createWing.isPending}
            onAdd={(name) => createWing.mutateAsync(name).then(() => {})} />
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold text-foreground">Classes</h2>
        <ul className="mt-2 divide-y divide-border">
          {data.classes.length === 0 && <p className="text-sm text-muted-foreground py-2">No classes yet.</p>}
          {data.classes.map((c) => (
            <InlineEditRow
              key={c.id}
              name={c.name}
              memberCount={c.memberCount}
              editable={canManageWings}
              busy={updateClass.isPending}
              onSave={(name) => updateClass.mutateAsync({ id: c.id, name })}
            />
          ))}
        </ul>
        {canManageWings && (
          <AddItemForm placeholder="New class name" busy={createClass.isPending}
            onAdd={(name) => createClass.mutateAsync(name).then(() => {})} />
        )}
      </div>
    </div>
  );
}
