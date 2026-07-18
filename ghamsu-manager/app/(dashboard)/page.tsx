'use client';
import { useMe } from '@/lib/hooks/use-me';
import { NationalDashboard } from '@/components/dashboard/national-dashboard';
import { LocalPresidentDashboard } from '@/components/dashboard/local-president-dashboard';
import { TreasurerDashboard } from '@/components/dashboard/treasurer-dashboard';
import { SecretaryDashboard } from '@/components/dashboard/secretary-dashboard';

export default function DashboardHome() {
  const { data: me, isLoading, error } = useMe();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !me) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Unable to load your account'}</p>;

  switch (me.activeRole.role) {
    case 'national_president': return <NationalDashboard />;
    case 'local_president': return <LocalPresidentDashboard />;
    case 'treasurer': return <TreasurerDashboard />;
    case 'secretary': return <SecretaryDashboard />;
    default: return null;
  }
}
