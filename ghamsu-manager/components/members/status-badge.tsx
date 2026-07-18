import type { MemberStatus } from '@/lib/types';

const STATUS_STYLES: Record<MemberStatus, string> = {
  prospective: 'bg-muted text-muted-foreground',
  active: 'bg-chart-4/15 text-chart-4',
  executive: 'bg-primary/10 text-primary',
  associate: 'bg-chart-5/15 text-chart-5',
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function NoEmailBadge() {
  return (
    <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
      no email
    </span>
  );
}
