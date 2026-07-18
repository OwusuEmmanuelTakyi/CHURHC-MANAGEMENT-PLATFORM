import { Globe, Building2, Coins, FileText } from 'lucide-react';
import type { Role } from '@/lib/types';

// Role badge colors are intentionally inline Tailwind hues, not theme tokens.
const ROLE_BADGE_STYLES: Record<Role, string> = {
  national_president: 'bg-amber-100 text-amber-800',   // Gold → National
  local_president: 'bg-blue-100 text-blue-800',         // Blue → Local
  treasurer: 'bg-green-100 text-green-800',             // Green → Finance/Treasurer
  secretary: 'bg-purple-100 text-purple-800',           // Purple → Secretary
};

const ROLE_LABELS: Record<Role, string> = {
  national_president: 'National President',
  local_president: 'Local President',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
};

const ROLE_ICONS: Record<Role, typeof Globe> = {
  national_president: Globe,
  local_president: Building2,
  treasurer: Coins,
  secretary: FileText,
};

// "National · President" or "UG Local · Treasurer" — the scope switcher's format.
export function scopeLabel(role: Role, shortCode?: string | null): string {
  const scope = role === 'national_president' ? 'National' : `${shortCode ?? '—'} Local`;
  const title = role === 'national_president' || role === 'local_president' ? 'President'
    : role === 'treasurer' ? 'Treasurer' : 'Secretary';
  return `${scope} · ${title}`;
}

export function RoleBadge({ role, suffix }: { role: Role; suffix?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE_STYLES[role]}`}>
      {ROLE_LABELS[role]}{suffix ? ` · ${suffix}` : ''}
    </span>
  );
}

export function ScopePill({ role, shortCode }: { role: Role; shortCode?: string | null }) {
  const Icon = ROLE_ICONS[role];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ROLE_BADGE_STYLES[role]}`}>
      <Icon size={13} strokeWidth={2.5} />
      {scopeLabel(role, shortCode)}
    </span>
  );
}
