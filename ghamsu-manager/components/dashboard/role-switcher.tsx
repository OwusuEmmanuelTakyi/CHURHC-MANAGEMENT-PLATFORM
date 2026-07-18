'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { MeResponse } from '@/lib/types';
import { RoleBadge } from './role-badge';

export function RoleSwitcher({ me }: { me: MeResponse }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const activeAssignment = me.roles.find((r) => r.id === me.activeRole.id);

  if (me.roles.length <= 1) {
    return <RoleBadge role={me.activeRole.role} suffix={activeAssignment?.locals?.short_code} />;
  }

  async function handleChange(assignmentId: number) {
    setBusy(true);
    try {
      await apiFetch('/api/auth/role-switch', {
        method: 'POST',
        body: JSON.stringify({ assignmentId }),
      });
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <RoleBadge role={me.activeRole.role} suffix={activeAssignment?.locals?.short_code} />
      <select
        className="text-sm border border-border rounded-lg px-2 py-1 bg-input-background text-foreground disabled:opacity-50"
        value={me.activeRole.id}
        disabled={busy}
        onChange={(e) => handleChange(Number(e.target.value))}
      >
        {me.roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.role_type.replace('_', ' ')}{r.locals ? ` · ${r.locals.short_code}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
