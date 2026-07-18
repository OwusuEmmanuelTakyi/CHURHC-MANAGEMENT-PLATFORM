'use client';
import { useMember } from '@/lib/hooks/use-members';
import { StatusBadge, NoEmailBadge } from './status-badge';

const EVENT_LABELS: Record<string, string> = {
  joined: 'Joined',
  wing_changed: 'Wing changed',
  class_changed: 'Class changed',
  status_changed: 'Status changed',
  level_updated: 'Level updated',
  position_assigned: 'Position assigned',
};

export function MemberDrawer({
  memberId, onClose, onEdit, onDelete,
}: {
  memberId: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data, isLoading, error } = useMember(memberId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-card shadow-lg overflow-y-auto p-5">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>

        {isLoading && <p className="text-sm text-muted-foreground mt-4">Loading…</p>}
        {error && <p className="text-sm text-destructive mt-4">{(error as Error).message}</p>}

        {data && (
          <>
            <div className="mt-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{data.member.full_name}</h2>
                <p className="text-sm text-muted-foreground">{data.member.student_id}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={data.member.status} />
                {!data.member.email && <NoEmailBadge />}
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-foreground">
              <div><dt className="text-muted-foreground">Phone</dt><dd>{data.member.phone}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd>{data.member.email ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Level</dt><dd>{data.member.level}</dd></div>
              <div><dt className="text-muted-foreground">Gender</dt><dd className="capitalize">{data.member.gender}</dd></div>
              <div><dt className="text-muted-foreground">Hall</dt><dd>{data.member.hall_of_residence ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Joined</dt><dd>{data.member.joined_at}</dd></div>
              <div><dt className="text-muted-foreground">Date of birth</dt><dd>{data.member.date_of_birth ?? '—'}</dd></div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Expected graduation</dt>
                <dd>{data.member.expected_graduation ?? '—'}</dd>
              </div>
            </dl>

            <div className="mt-5 flex gap-2">
              <button onClick={onEdit} className="rounded-lg px-3 py-1.5 text-sm border border-border text-foreground">
                Edit
              </button>
              <button onClick={onDelete} className="rounded-lg px-3 py-1.5 text-sm border border-destructive/40 text-destructive">
                Remove
              </button>
            </div>

            <h3 className="mt-6 font-semibold text-sm text-foreground">History</h3>
            <ol className="mt-2 space-y-3 border-l border-border pl-4">
              {data.history.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
              {data.history.map((h, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium text-foreground">{EVENT_LABELS[h.event_type] ?? h.event_type}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(h.created_at).toLocaleString()}
                    {h.executives?.name ? ` · ${h.executives.name}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
