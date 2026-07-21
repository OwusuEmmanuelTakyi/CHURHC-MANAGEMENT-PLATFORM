'use client';
import Link from 'next/link';
import { AlertTriangle, Mail, Users2 } from 'lucide-react';
import { useNationalDashboard } from '@/lib/hooks/use-dashboard';
import { useAuditFeed } from '@/lib/hooks/use-audit';
import { StatCard } from './stat-card';

const CHART_HEIGHT = 160;

function GroupedBarChart({ data }: { data: { short_code: string; totalMembers: number; activeMembers: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.totalMembers, d.activeMembers]));

  return (
    <div className="flex items-end gap-3" style={{ height: CHART_HEIGHT }}>
      {data.map((d) => (
        <div key={d.short_code} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <div className="flex items-end gap-0.5 flex-1 w-full justify-center">
            <div className="flex flex-col items-center justify-end h-full">
              <span className="text-[10px] text-foreground mb-1">{d.totalMembers}</span>
              <div
                title={`Total members: ${d.totalMembers}`}
                className="w-4 max-w-6 bg-chart-1 rounded-t"
                style={{ height: Math.max(Math.round((d.totalMembers / max) * (CHART_HEIGHT - 24)), 2) }}
              />
            </div>
            <div className="flex flex-col items-center justify-end h-full">
              <span className="text-[10px] text-foreground mb-1">{d.activeMembers}</span>
              <div
                title={`Active: ${d.activeMembers}`}
                className="w-4 max-w-6 bg-chart-2 rounded-t"
                style={{ height: Math.max(Math.round((d.activeMembers / max) * (CHART_HEIGHT - 24)), 2) }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground mt-1 border-t border-border pt-1 w-full text-center">{d.short_code}</span>
        </div>
      ))}
    </div>
  );
}

function TrendArrowLabel({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <span className="text-chart-4">↑</span>;
  if (trend === 'down') return <span className="text-destructive">↓</span>;
  return <span className="text-muted-foreground">→</span>;
}

export function NationalDashboard() {
  const { data, isLoading, error } = useNationalDashboard();
  const { data: auditPages } = useAuditFeed();
  const recentActivity = (auditPages?.pages[0]?.logs ?? []).slice(0, 6);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Failed to load'}</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={String(data.stats.totalMembers)} note="all locals" />
        <StatCard label="Active Students" value={String(data.stats.activeMembers)} />
        <StatCard label="Associates/Alumni" value={String(data.stats.associatesAlumni)} />
        <StatCard label="Executives" value={String(data.stats.executivesCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">Members by local</h2>
          <GroupedBarChart data={data.chartData} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">Needs attention</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/associates-review" className="flex items-start gap-2 rounded-lg bg-chart-5/10 p-2.5 hover:bg-chart-5/15">
                <AlertTriangle size={16} className="text-chart-5 mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{data.needsAttention.gradOverdueCount} past expected graduation</span>
              </Link>
            </li>
            <li>
              <Link href="/members" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 hover:bg-destructive/15">
                <Mail size={16} className="text-destructive mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{data.needsAttention.noEmailCount} missing email addresses</span>
              </Link>
            </li>
            {data.needsAttention.handoverDueCount > 0 && (
              <li>
                <Link href="/leadership" className="flex items-start gap-2 rounded-lg bg-chart-3/10 p-2.5 hover:bg-chart-3/15">
                  <Users2 size={16} className="text-chart-3 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">
                    Leadership handover due for {data.needsAttention.handoverDueCount} national position(s)
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5">
          <h2 className="font-semibold text-foreground mb-3">Comparative locals</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Local</th>
              <th className="px-4 py-2 font-medium">Total members</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Wings</th>
              <th className="px-4 py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.comparativeLocals.map((row) => (
              <tr key={row.local_id}>
                <td className="px-4 py-2">
                  <Link href={`/locals/${row.local_id}`} className="text-primary hover:underline">{row.name}</Link>
                </td>
                <td className="px-4 py-2 text-foreground">{row.totalMembers}</td>
                <td className="px-4 py-2 text-foreground">{row.activeMembers}</td>
                <td className="px-4 py-2 text-foreground">{row.wingsCount}</td>
                <td className="px-4 py-2"><TrendArrowLabel trend={row.trend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold text-foreground mb-3">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((log) => (
              <li key={log.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-foreground">{log.action}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {new Date(log.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
