'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  useAttendanceLinks, useCreateAttendanceLink, useRevokeAttendanceLink,
} from '@/lib/hooks/use-attendance';
import { ApiClientError } from '@/lib/api-client';

function LinkRow({ url, onRevoke, revoking }: { url: string; onRevoke: () => void; revoking: boolean }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 140, margin: 1 }).then(setQr).catch(() => {});
  }, [url]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3 flex flex-col sm:flex-row gap-3">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URI, not a remote image
        <img src={qr} alt="Check-in QR code" className="w-24 h-24 shrink-0 rounded border border-border" />
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <p className="text-xs font-mono text-foreground break-all">{url}</p>
        <div className="flex items-center gap-3">
          <button onClick={handleCopy} className="text-xs text-primary font-medium">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button onClick={onRevoke} disabled={revoking} className="text-xs text-destructive disabled:opacity-50">
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckInLinkPanel({ serviceId }: { serviceId: number }) {
  const { data, isLoading } = useAttendanceLinks(serviceId);
  const create = useCreateAttendanceLink(serviceId);
  const revoke = useRevokeAttendanceLink(serviceId);
  const [origin, setOrigin] = useState('');
  const [usherLabel, setUsherLabel] = useState('');
  const [revealedPasscode, setRevealedPasscode] = useState<{ token: string; passcode: string } | null>(null);

  useEffect(() => {
    // window doesn't exist during SSR — deferring to an effect avoids a
    // hydration mismatch, at the cost of one extra render after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  if (isLoading) return null;

  const createError = create.error instanceof ApiClientError ? create.error.message : create.error ? 'Something went wrong.' : '';
  const revokeError = revoke.error instanceof ApiClientError ? revoke.error.message : revoke.error ? 'Something went wrong.' : '';

  async function handleCreateUsher() {
    const res = await create.mutateAsync({ kind: 'usher', label: usherLabel.trim() || null });
    if (res.passcode) setRevealedPasscode({ token: res.token, passcode: res.passcode });
    setUsherLabel('');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-3 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Self check-in link</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Share this (or the QR code) so attendees can mark themselves present with their student ID — everyone can use it
          at once. It stops working automatically at the end of the day.
        </p>

        {createError && <p className="text-xs text-destructive mt-2">{createError}</p>}
        {revokeError && <p className="text-xs text-destructive mt-2">{revokeError}</p>}

        {data?.selfToken && origin ? (
          <div className="mt-3">
            <LinkRow
              url={`${origin}/checkin/${data.selfToken}`}
              onRevoke={() => revoke.mutate(data.selfToken!)}
              revoking={revoke.isPending}
            />
          </div>
        ) : (
          <button
            onClick={() => create.mutate({ kind: 'self' })}
            disabled={create.isPending}
            className="mt-3 rounded-lg bg-primary text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {create.isPending ? 'Generating…' : 'Get check-in link'}
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <h2 className="text-sm font-semibold text-foreground">Usher links</h2>
        <p className="text-xs text-muted-foreground mt-1">
          A separate link per usher, locked behind a one-time code — they enter the code once, then can mark any number
          of people present in a row. Also expires at the end of the day.
        </p>

        {revealedPasscode && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-foreground">
              Access code (shown once — share it with the usher along with the link below):
            </p>
            <p className="text-lg font-mono font-semibold text-foreground tracking-widest mt-1">{revealedPasscode.passcode}</p>
            <button onClick={() => setRevealedPasscode(null)} className="text-xs text-primary font-medium mt-1">
              Done
            </button>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={usherLabel}
            onChange={(e) => setUsherLabel(e.target.value)}
            placeholder="Usher name (optional)"
            className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background text-foreground"
          />
          <button
            onClick={handleCreateUsher}
            disabled={create.isPending}
            className="shrink-0 rounded-lg bg-primary text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : '+ New usher link'}
          </button>
        </div>

        {data && data.usherLinks.length > 0 && origin && (
          <div className="mt-3 space-y-2">
            {data.usherLinks.map((l) => (
              <div key={l.token}>
                {l.label && <p className="text-xs text-muted-foreground mb-1">{l.label}</p>}
                <LinkRow
                  url={`${origin}/checkin/${l.token}`}
                  onRevoke={() => revoke.mutate(l.token)}
                  revoking={revoke.isPending}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
