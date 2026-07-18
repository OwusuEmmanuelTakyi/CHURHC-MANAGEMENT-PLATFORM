'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS, canSeeNavItem } from '@/lib/nav-items';

const MAX_DIRECT_ITEMS = 4;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function MobileBottomNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => canSeeNavItem(i, permissions));
  const direct = items.slice(0, MAX_DIRECT_ITEMS);
  const overflow = items.slice(MAX_DIRECT_ITEMS);

  return (
    <>
      {overflowOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOverflowOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div className="absolute bottom-16 left-0 right-0 bg-card rounded-t-2xl border-t border-border p-3 grid grid-cols-3 gap-2">
            {overflow.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOverflowOpen(false)}
                  className="flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-foreground hover:bg-secondary/60"
                >
                  <Icon size={20} />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card border-t border-border flex items-stretch h-16">
        {direct.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <button
            onClick={() => setOverflowOpen((v) => !v)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
          >
            {overflowOpen ? <X size={20} /> : <Menu size={20} />}
            <span className="text-[10px]">More</span>
          </button>
        )}
      </nav>
    </>
  );
}
