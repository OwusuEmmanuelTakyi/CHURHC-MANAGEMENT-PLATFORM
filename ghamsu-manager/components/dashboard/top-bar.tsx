'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav-items';
import { useAcademicYearContext } from '@/lib/academic-year-context';
import { Avatar } from '@/components/shared/avatar';
import { ScopePill } from './role-badge';
import type { MeResponse } from '@/lib/types';

function pageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const item = NAV_ITEMS.find((i) => i.href !== '/' && pathname.startsWith(i.href));
  return item?.label ?? 'Dashboard';
}

export function TopBar({ me }: { me: MeResponse }) {
  const router = useRouter();
  const pathname = usePathname();
  const { year, setYear, availableYears } = useAcademicYearContext();
  const [search, setSearch] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/members?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="border-b border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-foreground">{pageTitle(pathname)}</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Academic year"
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm bg-input-background text-foreground w-48"
            />
          </form>

          {me.permissions.includes('audit.view') && (
            <button
              onClick={() => router.push('/audit')}
              aria-label="Recent activity"
              className="text-muted-foreground hover:text-foreground"
            >
              <Bell size={18} />
            </button>
          )}

          <Link href="/profile" className="flex items-center gap-2">
            <Avatar name={me.profile.name} size="sm" />
            <ScopePill role={me.activeRole.role} shortCode={me.roles.find((r) => r.id === me.activeRole.id)?.locals?.short_code} />
          </Link>
        </div>
      </div>
    </header>
  );
}
