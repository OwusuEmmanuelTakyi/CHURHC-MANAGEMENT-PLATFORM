'use client';
import { useMe } from '@/lib/hooks/use-me';
import { Avatar } from '@/components/shared/avatar';
import { ScopePill } from '@/components/dashboard/role-badge';

export default function ProfilePage() {
  const { data: me, isLoading, error } = useMe();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !me) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Unable to load your account'}</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-foreground mb-4">My profile</h1>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-4">
        <Avatar name={me.profile.name} size="md" />
        <div>
          <p className="font-semibold text-foreground">{me.profile.name}</p>
          <div className="mt-1">
            <ScopePill role={me.activeRole.role} shortCode={me.roles.find((r) => r.id === me.activeRole.id)?.locals?.short_code} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mt-4">
        <h2 className="font-semibold text-foreground mb-3">Contact details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{me.profile.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-foreground">{me.profile.phone}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mt-4">
        <h2 className="font-semibold text-foreground mb-3">Roles held</h2>
        <ul className="divide-y divide-border">
          {me.roles.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between text-sm">
              <span className="text-foreground capitalize">{r.role_type.replace('_', ' ')}</span>
              <span className="text-muted-foreground">
                {r.locals ? `${r.locals.name} (${r.locals.short_code})` : 'National'} · {r.academic_year}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
