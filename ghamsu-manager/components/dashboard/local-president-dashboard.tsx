'use client';
import Link from 'next/link';
import { useLocalDashboard } from '@/lib/hooks/use-dashboard';
import { StatCard } from './stat-card';
import { BirthdaysCard } from './birthdays-card';
import { RegistrationLinkWidget } from '@/components/registration/registration-link-widget';

// Matches --chart-1..6 from globals.css — literal hex needed here since conic-gradient
// can't consume a Tailwind class, only a real color value.
const WING_COLORS = ['#1B3A6B', '#D4A017', '#2A6FAB', '#4CAF7D', '#E07B54', '#7C5CBF'];

function WingDonut({ segments, total }: { segments: { name: string; count: number; color: string }[]; total: number }) {
  const { parts } = segments.reduce<{ parts: string[]; cumulative: number }>((acc, s) => {
    const pct = total > 0 ? (s.count / total) * 100 : 0;
    const end = acc.cumulative + pct;
    return { parts: [...acc.parts, `${s.color} ${acc.cumulative}% ${end}%`], cumulative: end };
  }, { parts: [], cumulative: 0 });
  const stops = parts.join(', ') || 'var(--muted) 0% 100%';

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative w-36 h-36 rounded-full shrink-0" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-4 rounded-full bg-card flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">members</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-foreground">{s.name}</span>
            <span className="text-muted-foreground">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClassBarList({ classes }: { classes: { name: string; count: number }[] }) {
  const max = Math.max(1, ...classes.map((c) => c.count));
  return (
    <div className="space-y-2.5">
      {classes.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <span className="w-28 text-sm text-foreground truncate shrink-0">{c.name}</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-chart-1 rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
          </div>
          <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{c.count}</span>
        </div>
      ))}
    </div>
  );
}

export function LocalPresidentDashboard() {
  const { data, isLoading, error } = useLocalDashboard();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Failed to load'}</p>;

  const wingSegments = data.wingBreakdown.map((w, i) => ({
    name: w.name, count: w.count, color: WING_COLORS[i % WING_COLORS.length],
  }));
  const donutTotal = wingSegments.reduce((sum, s) => sum + s.count, 0) + data.noWingCount;

  return (
    <div className="space-y-6">
      <RegistrationLinkWidget />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={String(data.stats.totalMembers)} note="University of Ghana only" />
        <StatCard label="Active Students" value={String(data.stats.activeMembers)} note="Currently enrolled" />
        <StatCard label="Graduation Due" value={String(data.stats.graduationDueCount)} note="Overdue review count" />
        <StatCard label="Executives" value={String(data.stats.executivesCount)} note="Local leadership" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-semibold text-foreground mb-3">Members by wing</h2>
            <WingDonut segments={wingSegments} total={donutTotal} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-semibold text-foreground mb-3">Members by class group</h2>
            {data.classBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes set up yet.</p>
            ) : (
              <ClassBarList classes={data.classBreakdown} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-semibold text-foreground">Graduation review</h2>
            <p className="text-2xl font-semibold text-foreground mt-2">{data.stats.graduationDueCount}</p>
            <p className="text-sm text-muted-foreground mt-1">members past expected graduation</p>
            <Link href="/graduation-review" className="inline-block mt-3 rounded-lg bg-primary text-white text-sm px-3 py-1.5">
              Review now
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-semibold text-foreground mb-3">Wing summary</h2>
            <ul className="space-y-2">
              {data.wingBreakdown.map((w) => (
                <li key={w.wing_id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{w.name}</span>
                  <span className="rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">{w.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <BirthdaysCard />
        </div>
      </div>
    </div>
  );
}
