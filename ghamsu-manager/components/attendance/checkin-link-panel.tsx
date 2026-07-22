'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Clock, Copy, KeyRound, Link2, Loader2, MessageCircle, Trash2, UserPlus, Users } from 'lucide-react';
import {
  useAttendanceLinks, useCreateAttendanceLink, useRevokeAttendanceLink,
} from '@/lib/hooks/use-attendance';
import { ApiClientError } from '@/lib/api-client';

function formatExpiry(expiresAt: string | null, now: number): string | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - now;
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `Expires in ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  return `Expires in ${Math.max(minutes, 1)}m`;
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const label = formatExpiry(expiresAt, now);
  if (!label) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${label === 'Expired' ? 'text-destructive' : 'text-muted-foreground'}`}>
      <Clock size={11} />
      {label}
    </span>
  );
}

function LinkRow({
  url, expiresAt, onRevoke, revoking,
}: { url: string; expiresAt: string | null; onRevoke: () => void; revoking: boolean }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 148, margin: 1, color: { dark: '#1B2A45ff', light: '#00000000' } }).then(setQr).catch(() => {});
  }, [url]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3 flex flex-col sm:flex-row gap-3">
      {qr && (
        <div className="shrink-0 rounded-lg bg-white p-2 border border-border w-fit mx-auto sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URI, not a remote image */}
          <img src={qr} alt="Check-in QR code" className="w-24 h-24" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
        <p className="text-xs font-mono text-foreground break-all">{url}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            onClick={onRevoke}
            disabled={revoking}
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={13} />
            Revoke
          </button>
          <ExpiryBadge expiresAt={expiresAt} />
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
  const [revealedLink, setRevealedLink] = useState<{ token: string; passcode: string } | null>(null);
  const [messageCopied, setMessageCopied] = useState(false);

  useEffect(() => {
    // window doesn't exist during SSR — deferring to an effect avoids a
    // hydration mismatch, at the cost of one extra render after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 mb-3 animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-16 rounded-lg bg-muted" />
      </div>
    );
  }

  const createError = create.error instanceof ApiClientError ? create.error.message : create.error ? 'Something went wrong.' : '';
  const revokeError = revoke.error instanceof ApiClientError ? revoke.error.message : revoke.error ? 'Something went wrong.' : '';

  async function handleCreateUsher() {
    const res = await create.mutateAsync({ kind: 'usher', label: usherLabel.trim() || null });
    if (res.passcode) setRevealedLink({ token: res.token, passcode: res.passcode });
    setUsherLabel('');
  }

  async function handleCopyShareMessage() {
    if (!revealedLink || !origin) return;
    const url = `${origin}/checkin/${revealedLink.token}`;
    const message = `You're set up to check people in!\n\nLink: ${url}\nCode: ${revealedLink.passcode}\n\nOpen the link, enter the code once, then check in as many people as you like by their student ID.`;
    await navigator.clipboard.writeText(message);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-3 space-y-5">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Link2 size={15} className="text-primary" />
          Self check-in link
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Share this (or the QR code) so attendees can mark themselves present with their student ID — everyone can use it
          at once. It stops working automatically at the end of the day.
        </p>

        {createError && <p className="text-xs text-destructive mt-2">{createError}</p>}
        {revokeError && <p className="text-xs text-destructive mt-2">{revokeError}</p>}

        {data?.self && origin ? (
          <div className="mt-3 animate-fade-in-up">
            <LinkRow
              url={`${origin}/checkin/${data.self.token}`}
              expiresAt={data.self.expires_at}
              onRevoke={() => revoke.mutate(data.self!.token)}
              revoking={revoke.isPending}
            />
          </div>
        ) : (
          <button
            onClick={() => create.mutate({ kind: 'self' })}
            disabled={create.isPending}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
            {create.isPending ? 'Generating…' : 'Get check-in link'}
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Users size={15} className="text-primary" />
          Usher links
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          A separate link per usher, locked behind a one-time code — they enter the code once, then can mark any number
          of people present in a row. Also expires at the end of the day.
        </p>

        {revealedLink && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-fade-in-up">
            <p className="flex items-center gap-1.5 text-xs text-foreground">
              <KeyRound size={13} className="text-primary" />
              Access code (shown once — share it with the usher along with the link below):
            </p>
            <p className="text-lg font-mono font-semibold text-foreground tracking-widest mt-1.5">{revealedLink.passcode}</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleCopyShareMessage}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {messageCopied ? <Check size={13} /> : <MessageCircle size={13} />}
                {messageCopied ? 'Copied!' : 'Copy link + code to share'}
              </button>
              <button onClick={() => setRevealedLink(null)} className="text-xs text-muted-foreground">
                Done
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={usherLabel}
            onChange={(e) => setUsherLabel(e.target.value)}
            placeholder="Usher name (optional)"
            className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          <button
            onClick={handleCreateUsher}
            disabled={create.isPending}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            {create.isPending ? 'Creating…' : 'New usher link'}
          </button>
        </div>

        {data && data.usherLinks.length > 0 && origin && (
          <div className="mt-3 space-y-3">
            {data.usherLinks.map((l) => (
              <div key={l.token} className="animate-fade-in-up">
                {l.label && (
                  <p className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
                    <Users size={11} className="text-muted-foreground" />
                    {l.label}
                  </p>
                )}
                <LinkRow
                  url={`${origin}/checkin/${l.token}`}
                  expiresAt={l.expires_at}
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
