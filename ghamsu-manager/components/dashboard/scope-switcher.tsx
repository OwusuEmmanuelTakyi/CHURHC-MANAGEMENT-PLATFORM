'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, User } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import type { MeResponse } from '@/lib/types';
import { ScopePill, scopeLabel } from './role-badge';

export function ScopeSwitcher({ me }: { me: MeResponse }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const otherRoles = me.roles.filter((r) => r.id !== me.activeRole.id);

  async function handleSwitch(assignmentId: number) {
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
    <div className="rounded-xl bg-sidebar-accent/60 p-3">
      <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
        <User size={13} />
        Viewing as
      </div>
      <div className="mt-1.5">
        <ScopePill role={me.activeRole.role} shortCode={me.roles.find((r) => r.id === me.activeRole.id)?.locals?.short_code} />
      </div>

      {otherRoles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-sidebar-foreground/10">
          <p className="text-xs text-sidebar-foreground/70 mb-1.5">Switch to</p>
          <div className="flex flex-col gap-1">
            {otherRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSwitch(r.id)}
                disabled={busy}
                className="flex items-center gap-1.5 text-xs text-sidebar-foreground/90 hover:text-sidebar-foreground disabled:opacity-50 text-left"
              >
                <ArrowRight size={12} />
                {scopeLabel(r.role_type, r.locals?.short_code)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
