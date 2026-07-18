'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/lib/hooks/use-me';
import { AcademicYearProvider } from '@/lib/academic-year-context';
import { NAV_ITEMS, canSeeNavItem } from '@/lib/nav-items';
import { ScopeSwitcher } from './scope-switcher';
import { SidebarUserRow } from './sidebar-user-row';
import { TopBar } from './top-bar';
import { MobileBottomNav } from './mobile-bottom-nav';
import type { MeResponse } from '@/lib/types';

function NavLinks({ permissions, onNavigate }: { permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => canSeeNavItem(i, permissions));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium border-l-2 transition-colors ${
              active
                ? 'bg-sidebar-accent text-sidebar-foreground border-sidebar-primary'
                : 'text-sidebar-foreground/70 border-transparent hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ShellContents({ me, children }: { me: MeResponse; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-1 min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar px-4 py-5 gap-4">
        <div className="text-lg font-semibold px-2 text-sidebar-foreground">GHAMSU Manager</div>
        <ScopeSwitcher me={me} />
        <div className="flex-1 overflow-y-auto">
          <NavLinks permissions={me.permissions} />
        </div>
        <SidebarUserRow me={me} />
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar px-4 py-5 flex flex-col gap-4">
            <div className="text-lg font-semibold px-2 text-sidebar-foreground">GHAMSU Manager</div>
            <ScopeSwitcher me={me} />
            <div className="flex-1 overflow-y-auto">
              <NavLinks permissions={me.permissions} onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarUserRow me={me} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <div className="lg:hidden flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <button
            className="rounded-lg border border-border px-2 py-1 text-sm text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="text-sm font-semibold text-foreground">GHAMSU Manager</span>
          <span className="w-8" />
        </div>
        <TopBar me={me} />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 min-w-0 bg-background overflow-y-auto">{children}</main>
      </div>

      <MobileBottomNav permissions={me.permissions} />
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading, error } = useMe();

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (error || !me) {
    return (
      <div className="flex flex-1 items-center justify-center text-destructive">
        {(error as Error)?.message ?? 'Unable to load your account'}
      </div>
    );
  }

  return (
    <AcademicYearProvider>
      <ShellContents me={me}>{children}</ShellContents>
    </AcademicYearProvider>
  );
}
