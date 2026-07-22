'use client';
import { use, useMemo, useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { useAttendanceCheckIn, useToggleAttendance } from '@/lib/hooks/use-attendance';
import { CheckInLinkPanel } from '@/components/attendance/checkin-link-panel';

export default function ServiceCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const serviceId = Number(id);

  const { data: me } = useMe();
  const { data, isLoading, error } = useAttendanceCheckIn(serviceId);
  const toggle = useToggleAttendance(serviceId);

  const [search, setSearch] = useState('');
  const [wingFilter, setWingFilter] = useState('');

  const canTake = me?.permissions.includes('attendance.take') ?? false;

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    return data.members.filter((m) => {
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (wingFilter && String(m.wing_id) !== wingFilter) return false;
      return true;
    });
  }, [data, search, wingFilter]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Not found'}</p>;

  const wingNameById = new Map(data.wings.map((w) => [w.id, w.name]));

  return (
    <div className="max-w-2xl">
      {canTake && <CheckInLinkPanel serviceId={serviceId} />}

      <div className="sticky top-0 z-10 bg-background pb-3 pt-1 -mt-1">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Present</span>
          <span className="text-2xl font-semibold text-foreground">{data.presentCount} / {data.totalCount}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-input-background text-foreground"
            placeholder="Search name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border border-border rounded-lg px-2 py-2 text-sm bg-input-background text-foreground"
            value={wingFilter}
            onChange={(e) => setWingFilter(e.target.value)}
          >
            <option value="">All wings</option>
            {data.wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
        {filteredMembers.map((m) => (
          <li key={m.id}>
            <button
              disabled={!canTake}
              onClick={() => toggle.mutate({ member_id: m.id, present: !m.present })}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                m.present ? 'bg-chart-4/15' : 'hover:bg-secondary/60'
              } ${!canTake ? 'cursor-default' : ''}`}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.wing_id ? (wingNameById.get(m.wing_id) ?? '') : 'No wing'} · Level {m.level}
                </p>
              </div>
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 ml-2 ${
                m.present ? 'bg-chart-4/20 text-chart-4' : 'bg-muted text-muted-foreground'
              }`}>
                {m.present ? 'Present' : 'Absent'}
              </span>
            </button>
          </li>
        ))}
        {filteredMembers.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">No members match.</li>
        )}
      </ul>
    </div>
  );
}
