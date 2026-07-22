'use client';
import { useRef, useState } from 'react';
import { useSubmitCheckIn } from '@/lib/hooks/use-public-checkin';
import { ApiClientError } from '@/lib/api-client';
import type { CheckInResult } from '@/lib/types';

export function PublicCheckInForm({ token }: { token: string }) {
  const submit = useSubmitCheckIn(token);
  const inputRef = useRef<HTMLInputElement>(null);
  const [studentId, setStudentId] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await submit.mutateAsync(studentId);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong — please try again.');
    }
  }

  function checkInSomeoneElse() {
    setResult(null);
    setStudentId('');
    setError('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (result) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/15 text-chart-4 text-2xl">
          ✓
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {result.alreadyMarked ? `${result.fullName}, you're already marked present` : `Welcome, ${result.fullName}!`}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {result.alreadyMarked ? 'No need to check in again — see you inside.' : "You're marked present for this event."}
        </p>
        <button
          onClick={checkInSomeoneElse}
          className="mt-6 rounded-lg border border-border text-foreground text-sm px-4 py-2"
        >
          Check in someone else
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="text-sm flex flex-col gap-1 text-foreground">
        Student ID
        <input
          ref={inputRef}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-3 text-lg tracking-wide bg-input-background text-foreground text-center"
          placeholder="e.g. UG0012345"
          autoFocus
          autoComplete="off"
          required
        />
      </label>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <button
        type="submit"
        disabled={submit.isPending}
        className="rounded-lg bg-primary text-white text-base font-medium py-3 disabled:opacity-50"
      >
        {submit.isPending ? 'Checking in…' : 'Mark me present'}
      </button>
    </form>
  );
}
