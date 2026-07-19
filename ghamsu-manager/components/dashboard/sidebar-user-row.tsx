import Link from 'next/link';
import { Avatar } from '@/components/shared/avatar';
import { LogoutButton } from './logout-button';
import type { MeResponse } from '@/lib/types';

export function SidebarUserRow({ me }: { me: MeResponse }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/40 px-3 py-2.5">
      <Avatar name={me.profile.name} tone="sidebar" />
      <div className="flex-1 min-w-0">
        <Link href="/profile" className="text-sm font-medium text-sidebar-foreground truncate block hover:underline">
          {me.profile.name}
        </Link>
        <div className="text-xs">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
