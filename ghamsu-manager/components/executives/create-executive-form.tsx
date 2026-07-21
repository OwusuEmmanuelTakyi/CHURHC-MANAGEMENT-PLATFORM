'use client';
import { useState } from 'react';
import { useCreateExecutive } from '@/lib/hooks/use-executives';
import { useLocals } from '@/lib/hooks/use-locals';
import { ApiClientError } from '@/lib/api-client';
import type { MeResponse, Role } from '@/lib/types';

const FIELD_CLASS = 'border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground';

export function CreateExecutiveForm({ me, onDone }: { me: MeResponse; onDone: () => void }) {
  const isNational = me.activeRole.role === 'national_president';
  const roleOptions: Role[] = isNational
    ? ['national_president', 'local_president', 'treasurer', 'secretary']
    : ['treasurer', 'secretary'];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roleType, setRoleType] = useState<Role>(roleOptions[0]);
  const [localId, setLocalId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  const { data: locals } = useLocals();
  const create = useCreateExecutive();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const resolvedLocalId = roleType === 'national_president'
      ? null
      : (isNational ? (localId ? Number(localId) : null) : me.activeRole.localId);

    if (roleType !== 'national_president' && !resolvedLocalId) {
      setError('Choose a local');
      return;
    }

    try {
      const res = await create.mutateAsync({ name, phone, email, role_type: roleType, local_id: resolvedLocalId });
      setResult({ email: res.email, tempPassword: res.tempPassword });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong');
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-foreground">Account created</h3>
        <p className="text-sm text-muted-foreground">
          Share these credentials with {result.email} securely (e.g. phone or WhatsApp) — this password is shown only once.
        </p>
        <dl className="text-sm space-y-1">
          <div><dt className="inline text-muted-foreground">Email: </dt><dd className="inline font-mono text-foreground">{result.email}</dd></div>
          <div><dt className="inline text-muted-foreground">Temporary password: </dt><dd className="inline font-mono text-foreground">{result.tempPassword}</dd></div>
        </dl>
        <button onClick={onDone} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">Done</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Full name
          <input className={FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Phone
          <input className={FIELD_CLASS} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0244123456" required />
        </label>
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Email
          <input className={FIELD_CLASS} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Role
          <select className={FIELD_CLASS} value={roleType} onChange={(e) => setRoleType(e.target.value as Role)}>
            {roleOptions.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </label>
        {isNational && roleType !== 'national_president' && (
          <label className="text-sm flex flex-col gap-1 text-foreground">
            Local
            <select className={FIELD_CLASS} value={localId} onChange={(e) => setLocalId(e.target.value)} required>
              <option value="">Select a local…</option>
              {locals?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={create.isPending} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50">
          {create.isPending ? 'Creating…' : 'Create account'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
