'use client';
import type { Member } from '@/lib/types';
import { StatusBadge, NoEmailBadge } from './status-badge';

export function MembersTable({
  members, onSelect, showDues,
}: {
  members: Member[];
  onSelect: (id: number) => void;
  showDues?: boolean;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No members match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Student ID</th>
            <th className="px-3 py-2 font-medium">Level</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Email</th>
            {showDues && <th className="px-3 py-2 font-medium">Dues</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((m) => (
            <tr key={m.id} onClick={() => onSelect(m.id)} className="cursor-pointer hover:bg-secondary/60">
              <td className="px-3 py-2 whitespace-nowrap text-foreground">{m.full_name}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{m.student_id}</td>
              <td className="px-3 py-2 text-foreground">{m.level}</td>
              <td className="px-3 py-2"><StatusBadge status={m.status} /></td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{m.phone}</td>
              <td className="px-3 py-2">{m.email ?? <NoEmailBadge />}</td>
              {showDues && (
                <td className="px-3 py-2">
                  {m.dues_paid ? (
                    <span className="rounded-full bg-chart-4/15 text-chart-4 px-2 py-0.5 text-xs font-medium">Paid</span>
                  ) : (
                    <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">Unpaid</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
