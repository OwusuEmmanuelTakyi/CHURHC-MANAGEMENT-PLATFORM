import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, CalendarCheck, Users, Building2, Crown, Mail, Wallet, FileText, UserPlus, ScrollText, GraduationCap, ShieldCheck,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  permission: string | string[] | null; // null = always visible; string[] = any of these
  icon: LucideIcon;
}

export function canSeeNavItem(item: NavItem, permissions: string[]): boolean {
  if (item.permission === null) return true;
  const required = Array.isArray(item.permission) ? item.permission : [item.permission];
  return required.some((p) => permissions.includes(p));
}

// Extend this list as later tasks add their pages — items are hidden
// unless the current role's permissions array includes `permission`.
// No "Settings" item: nothing in the app has a settings page to link to yet —
// better absent than a stub link to nowhere.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', permission: null, icon: LayoutDashboard },
  { label: 'Attendance', href: '/attendance', permission: 'attendance.view', icon: CalendarCheck },
  { label: 'Members', href: '/members', permission: 'members.view', icon: Users },
  { label: 'Locals & Wings', href: '/locals', permission: 'locals.view', icon: Building2 },
  { label: 'Leadership', href: '/leadership', permission: ['leadership.admin', 'leadership.view'], icon: Crown },
  { label: 'Associates Review', href: '/associates-review', permission: 'graduation.view', icon: GraduationCap },
  { label: 'Communications', href: '/email', permission: ['email.send', 'email.approve', 'email.draft'], icon: Mail },
  { label: 'Contributions', href: '/contributions', permission: 'contributions.view', icon: Wallet },
  { label: 'Documents', href: '/documents', permission: 'documents.view', icon: FileText },
  { label: 'Registration', href: '/registration', permission: 'registration.manage', icon: UserPlus },
  { label: 'Executives', href: '/executives', permission: 'executives.manage', icon: ShieldCheck },
  { label: 'Audit', href: '/audit', permission: 'audit.view', icon: ScrollText },
];
