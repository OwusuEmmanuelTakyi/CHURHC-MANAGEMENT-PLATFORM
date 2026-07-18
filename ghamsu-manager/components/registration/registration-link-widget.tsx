'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Link2, Copy, Check } from 'lucide-react';
import { useRegistrationLinks } from '@/lib/hooks/use-registration-links';

// A compact, read-only view of the active self-registration link — for
// surfacing on the dashboard and Members page. Full management (generate,
// QR code, deactivate) stays on the dedicated /registration page.
export function RegistrationLinkWidget() {
  const { data: links, isLoading } = useRegistrationLinks();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // window.location doesn't exist during SSR — deferring to an effect avoids
    // a hydration mismatch, at the cost of one extra render after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  if (isLoading) return null;

  const activeLink = links?.find((l) => l.active);

  if (!activeLink) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link2 size={16} />
          No active self-registration link yet.
        </div>
        <Link href="/registration" className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 whitespace-nowrap">
          Create one
        </Link>
      </div>
    );
  }

  const url = origin ? `${origin}/register/${activeLink.token}` : '';

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
      <Link2 size={16} className="text-primary shrink-0" />
      <span className="flex-1 min-w-0 text-sm font-mono text-foreground truncate">{url}</span>
      <button onClick={handleCopy} className="flex items-center gap-1 text-sm text-primary font-medium shrink-0">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <Link href="/registration" className="text-sm text-muted-foreground hover:text-foreground shrink-0">
        Manage
      </Link>
    </div>
  );
}
