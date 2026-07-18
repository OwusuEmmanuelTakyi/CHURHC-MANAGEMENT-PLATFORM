'use client';
import { useState } from 'react';
import { memberCreateSchema, memberUpdateSchema } from '@/lib/schemas';
import { useWings, useClasses } from '@/lib/hooks/use-wings-classes';
import { useCreateMember, useUpdateMember } from '@/lib/hooks/use-members';
import { ApiClientError } from '@/lib/api-client';
import type { MemberDetail } from '@/lib/types';

const STATUSES = ['prospective', 'active', 'executive', 'associate'] as const;
const LEVELS = [100, 200, 300, 400, 500, 600] as const;
const FIELD_CLASS = 'border border-border rounded-lg px-2 py-1.5 bg-input-background text-foreground';

interface FormState {
  student_id: string;
  full_name: string;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  hall_of_residence: string;
  wing_id: string;
  class_id: string;
  level: string;
  status: string;
  expected_graduation: string; // YYYY-MM from <input type=month>
  date_of_birth: string; // YYYY-MM-DD from <input type=date>
}

function initialState(member?: MemberDetail): FormState {
  return {
    student_id: member?.student_id ?? '',
    full_name: member?.full_name ?? '',
    gender: member?.gender ?? 'male',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    hall_of_residence: member?.hall_of_residence ?? '',
    wing_id: member?.wing_id ? String(member.wing_id) : '',
    class_id: member?.class_id ? String(member.class_id) : '',
    level: member ? String(member.level) : '100',
    status: member?.status ?? 'active',
    expected_graduation: member?.expected_graduation?.slice(0, 7) ?? '',
    date_of_birth: member?.date_of_birth ?? '',
  };
}

export function MemberFormDialog({
  mode, localId, member, onClose,
}: {
  mode: 'create' | 'edit';
  localId: number;
  member?: MemberDetail;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(member));
  const [errors, setErrors] = useState<string[]>([]);
  const { data: wings } = useWings(localId);
  const { data: classes } = useClasses(localId);
  const create = useCreateMember();
  const update = useUpdateMember(member?.id ?? -1);

  const busy = create.isPending || update.isPending;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const payload = {
      student_id: form.student_id,
      full_name: form.full_name,
      gender: form.gender,
      phone: form.phone,
      email: form.email || null,
      hall_of_residence: form.hall_of_residence || null,
      wing_id: form.wing_id ? Number(form.wing_id) : null,
      class_id: form.class_id ? Number(form.class_id) : null,
      level: Number(form.level),
      status: form.status,
      expected_graduation: form.expected_graduation ? `${form.expected_graduation}-01` : null,
      date_of_birth: form.date_of_birth || null,
      ...(mode === 'create' ? { local_id: localId } : {}),
    };

    const schema = mode === 'create' ? memberCreateSchema : memberUpdateSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      return;
    }

    try {
      if (mode === 'create') {
        await create.mutateAsync(parsed.data);
      } else {
        await update.mutateAsync(parsed.data);
      }
      onClose();
    } catch (err) {
      setErrors([err instanceof ApiClientError ? err.message : 'Something went wrong']);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-xl bg-card p-5 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-semibold text-lg text-foreground">{mode === 'create' ? 'Add member' : 'Edit member'}</h2>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Student ID
            <input className={FIELD_CLASS} value={form.student_id}
              onChange={(e) => set('student_id', e.target.value)} required />
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Full name
            <input className={FIELD_CLASS} value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)} required />
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Gender
            <select className={FIELD_CLASS} value={form.gender}
              onChange={(e) => set('gender', e.target.value as 'male' | 'female')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Phone
            <input className={FIELD_CLASS} value={form.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="0244123456" required />
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Email
            <input className={FIELD_CLASS} type="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="member@example.com" />
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Hall of residence
            <input className={FIELD_CLASS} value={form.hall_of_residence}
              onChange={(e) => set('hall_of_residence', e.target.value)} />
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Level
            <select className={FIELD_CLASS} value={form.level}
              onChange={(e) => set('level', e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Status
            <select className={FIELD_CLASS} value={form.status}
              onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Wing
            <select className={FIELD_CLASS} value={form.wing_id}
              onChange={(e) => set('wing_id', e.target.value)}>
              <option value="">None</option>
              {wings?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Class
            <select className={FIELD_CLASS} value={form.class_id}
              onChange={(e) => set('class_id', e.target.value)}>
              <option value="">None</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Expected graduation
            <input className={FIELD_CLASS} type="month" value={form.expected_graduation}
              onChange={(e) => set('expected_graduation', e.target.value)} />
          </label>
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Date of birth
            <input className={FIELD_CLASS} type="date" value={form.date_of_birth}
              onChange={(e) => set('date_of_birth', e.target.value)} />
          </label>
        </div>

        {errors.length > 0 && (
          <ul className="mt-3 text-sm text-destructive list-disc list-inside">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm border border-border text-foreground disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm bg-primary text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
