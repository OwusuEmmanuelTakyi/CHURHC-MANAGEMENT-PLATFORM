import type { BlastStatus } from '@/lib/types';

const STYLES: Record<BlastStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-chart-5/15 text-chart-5',
  approved: 'bg-chart-3/15 text-chart-3',
  sent: 'bg-chart-4/15 text-chart-4',
  failed: 'bg-destructive/10 text-destructive',
};

const LABELS: Record<BlastStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Scheduled',
  sent: 'Sent',
  failed: 'Failed',
};

export function BlastStatusBadge({ status }: { status: BlastStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
