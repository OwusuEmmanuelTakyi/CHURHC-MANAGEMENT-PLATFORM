'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, IdCard, Loader2 } from 'lucide-react';
import { useSubmitCheckIn } from '@/lib/hooks/use-public-checkin';
import { ApiClientError } from '@/lib/api-client';
import type { CheckInResult } from '@/lib/types';

const AUTO_RESET_MS = 3000;
const LAST_STUDENT_ID_KEY = 'ghamsu_last_student_id';

// Best-effort only — iOS Safari has no Vibration API at all, and some
// browsers block audio without a preceding gesture, so both quietly no-op
// rather than throwing when unsupported.
function vibrateCheckIn() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(80);
}

function playCheckInChime() {
  try {
    const AudioContextCtor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // silence is an acceptable fallback
  }
}

export function PublicCheckInForm({
  token, passcode, rememberId, onWrongCode,
}: { token: string; passcode?: string; rememberId?: boolean; onWrongCode?: () => void }) {
  const submit = useSubmitCheckIn(token);
  const inputRef = useRef<HTMLInputElement>(null);
  const [studentId, setStudentId] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [error, setError] = useState('');

  // Self check-in only: a regular attendee's ID doesn't change week to week.
  // Usher links (rememberId unset) never prefill — they're checking other
  // people in, not themselves.
  useEffect(() => {
    if (!rememberId) return;
    const saved = localStorage.getItem(LAST_STUDENT_ID_KEY);
    if (saved) setStudentId(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [rememberId]);

  function checkInSomeoneElse() {
    setResult(null);
    setStudentId('');
    setError('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Ushers move fast — after a successful check-in, hand the form back
  // automatically unless they've already moved on themselves.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(checkInSomeoneElse, AUTO_RESET_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await submit.mutateAsync({ student_id: studentId, passcode });
      setResult(res);
      setResultKey((k) => k + 1);
      vibrateCheckIn();
      playCheckInChime();
      if (rememberId) localStorage.setItem(LAST_STUDENT_ID_KEY, studentId);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401 && onWrongCode) {
        onWrongCode();
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong — please try again.');
    }
  }

  if (result) {
    return (
      <div className="text-center py-6 animate-fade-in-up">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-chart-4/15 text-chart-4 animate-pop-in">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {result.alreadyMarked ? `${result.fullName}, you're already marked present` : `Welcome, ${result.fullName}!`}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {result.alreadyMarked ? 'No need to check in again — see you inside.' : "You're marked present for this event."}
        </p>
        <button
          onClick={checkInSomeoneElse}
          className="mt-6 rounded-lg border border-border text-foreground text-sm px-4 py-2 hover:bg-secondary/60 transition-colors"
        >
          Check in someone else
        </button>
        <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            key={resultKey}
            className="h-full bg-primary/50 animate-shrink"
            style={{ animationDuration: `${AUTO_RESET_MS}ms` }}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="text-sm flex flex-col gap-1.5 text-foreground">
        Student ID
        <div className="relative">
          <IdCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full border border-border rounded-lg pl-10 pr-3 py-3 text-lg tracking-wide uppercase bg-input-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            placeholder="e.g. UG0012345"
            autoFocus
            autoComplete="off"
            required
          />
        </div>
      </label>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <button
        type="submit"
        disabled={submit.isPending}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary text-white text-base font-medium py-3 disabled:opacity-60 hover:brightness-110 active:scale-[0.99] transition-all"
      >
        {submit.isPending && <Loader2 size={18} className="animate-spin" />}
        {submit.isPending ? 'Checking in…' : 'Mark me present'}
      </button>
    </form>
  );
}
