'use client';
import { useState } from 'react';
import { useExecutives, useDeactivateExecutive, useActivateExecutive, useResetExecutivePassword } from '@/lib/hooks/use-executives';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { MeResponse } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  national_president: 'National President',
  local_president: 'Local President',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
};

export function ExecutivesList({ me }: { me: MeResponse }) {
  const { data: executives, isLoading, error } = useExecutives();
  const deactivate = useDeactivateExecutive();
  const activate = useActivateExecutive();
  const resetPassword = useResetExecutivePassword();
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(null);
  const [confirmActivateId, setConfirmActivateId] = useState<number | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState<{ name: string; tempPassword: string } | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!executives || executives.length === 0) return <p className="text-sm text-muted-foreground">No executives yet.</p>;

  const canManage = (roleType: string, userId: string) =>
    userId !== me.profile.id && (me.activeRole.role === 'national_president' || roleType === 'treasurer' || roleType === 'secretary');

  return (
    <>
      {newPassword && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-foreground">{newPassword.name} reactivated</h3>
          <p className="text-sm text-muted-foreground">
            Share this new temporary password securely — it&apos;s shown only once.
          </p>
          <p className="text-sm font-mono text-foreground">{newPassword.tempPassword}</p>
          <button onClick={() => setNewPassword(null)} className="text-sm text-primary font-medium">Done</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Local</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {executives.map((ex) => (
              <tr key={ex.id} className={ex.active ? '' : 'opacity-60'}>
                <td className="px-3 py-2 whitespace-nowrap text-foreground">{ex.executives?.name ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{ex.executives?.phone ?? '—'}</td>
                <td className="px-3 py-2 text-foreground">{ROLE_LABELS[ex.role_type]}</td>
                <td className="px-3 py-2 text-muted-foreground">{ex.locals?.short_code ?? 'National'}</td>
                <td className="px-3 py-2">
                  {ex.active ? (
                    <span className="rounded-full bg-chart-4/15 text-chart-4 text-xs font-medium px-2 py-0.5">Active</span>
                  ) : (
                    <span className="rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5">Inactive</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {canManage(ex.role_type, ex.user_id) && (
                    ex.active ? (
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmResetId(ex.id)} className="text-xs text-primary font-medium">
                          Reset password
                        </button>
                        <button onClick={() => setConfirmDeactivateId(ex.id)} className="text-xs text-destructive">
                          Deactivate
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmActivateId(ex.id)} className="text-xs text-primary font-medium">
                        Activate
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmDeactivateId !== null}
        title="Deactivate account"
        description="This revokes their login access immediately. It doesn't delete their history."
        confirmLabel="Deactivate"
        busy={deactivate.isPending}
        onCancel={() => setConfirmDeactivateId(null)}
        onConfirm={async () => {
          if (confirmDeactivateId === null) return;
          await deactivate.mutateAsync(confirmDeactivateId);
          setConfirmDeactivateId(null);
        }}
      />

      <ConfirmDialog
        open={confirmActivateId !== null}
        title="Reactivate account"
        description="This restores their login access and generates a new temporary password — shown once, so have a way to share it ready."
        confirmLabel="Reactivate"
        busy={activate.isPending}
        onCancel={() => setConfirmActivateId(null)}
        onConfirm={async () => {
          if (confirmActivateId === null) return;
          const ex = executives.find((e) => e.id === confirmActivateId);
          const res = await activate.mutateAsync(confirmActivateId);
          setNewPassword({ name: ex?.executives?.name ?? 'Executive', tempPassword: res.tempPassword });
          setConfirmActivateId(null);
        }}
      />

      <ConfirmDialog
        open={confirmResetId !== null}
        title="Reset password"
        description="This issues a new temporary password and immediately invalidates their current one — shown once, so have a way to share it ready."
        confirmLabel="Reset password"
        busy={resetPassword.isPending}
        onCancel={() => setConfirmResetId(null)}
        onConfirm={async () => {
          if (confirmResetId === null) return;
          const ex = executives.find((e) => e.id === confirmResetId);
          const res = await resetPassword.mutateAsync(confirmResetId);
          setNewPassword({ name: ex?.executives?.name ?? 'Executive', tempPassword: res.tempPassword });
          setConfirmResetId(null);
        }}
      />
    </>
  );
}
