'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  useRegistrationLinks, useCreateRegistrationLink, useDeactivateRegistrationLink,
} from '@/lib/hooks/use-registration-links';

function LinkRow({ token, active, url }: { token: string; active: boolean; url: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');
  const deactivate = useDeactivateRegistrationLink();

  useEffect(() => {
    QRCode.toDataURL(url, { width: 160, margin: 1 }).then(setQr).catch(() => {});
  }, [url]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-4">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URI, not a remote image
        <img src={qr} alt="Registration QR code" className="w-32 h-32 shrink-0 rounded-lg border border-border" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-foreground break-all">{url}</p>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={handleCopy} className="text-sm text-primary font-medium">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {active ? (
            <button
              onClick={() => deactivate.mutate(token)}
              disabled={deactivate.isPending}
              className="text-sm text-destructive disabled:opacity-50"
            >
              Deactivate
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Inactive</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function LinkManager() {
  const { data: links, isLoading, error } = useRegistrationLinks();
  const create = useCreateRegistrationLink();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // window.location doesn't exist during SSR — deferring to an effect avoids
    // a hydration mismatch, at the cost of one extra render after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const activeLink = links?.find((l) => l.active);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold text-foreground">Self-registration link</h2>
        <button
          onClick={() => create.mutate(null)}
          disabled={create.isPending}
          className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
        >
          {activeLink ? 'Generate new link' : 'Generate link'}
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {activeLink && origin && (
        <LinkRow token={activeLink.token} active={activeLink.active} url={`${origin}/register/${activeLink.token}`} />
      )}
      {!isLoading && !activeLink && (
        <p className="text-sm text-muted-foreground">No active link — generate one to start collecting registrations.</p>
      )}
    </div>
  );
}
