'use client';
import { use, useState } from 'react';
import { usePublicCheckInInfo } from '@/lib/hooks/use-public-checkin';
import { ApiClientError } from '@/lib/api-client';
import { PublicCheckInForm } from '@/components/attendance/public-checkin-form';
import { Logo } from '@/components/shared/logo';

function PasscodeGate({ onContinue }: { onContinue: (passcode: string) => void }) {
  const [passcode, setPasscode] = useState('');

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onContinue(passcode.trim()); }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted-foreground text-center">
        This link is for ushers. Enter the access code you were given — you&apos;ll only need to do this once.
      </p>
      <label className="text-sm flex flex-col gap-1 text-foreground">
        Access code
        <input
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-3 text-lg tracking-widest bg-input-background text-foreground text-center"
          placeholder="000000"
          autoFocus
          autoComplete="off"
          required
        />
      </label>
      <button type="submit" className="rounded-lg bg-primary text-white text-base font-medium py-3">
        Continue
      </button>
    </form>
  );
}

export default function PublicCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, isLoading, error } = usePublicCheckInInfo(token);
  const [passcode, setPasscode] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow p-6">
        <h1 className="flex items-center justify-center gap-2 text-xl font-semibold text-center text-primary mb-1">
          <Logo size={32} />
          GHAMSU Manager
        </h1>

        {isLoading && <p className="text-sm text-muted-foreground text-center mt-4">Loading…</p>}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">
              {error instanceof ApiClientError ? error.message : 'This check-in link is no longer available.'}
            </p>
          </div>
        )}

        {data && (
          <>
            <p className="text-sm text-muted-foreground text-center mb-1">{data.localName}</p>
            <p className="text-sm font-medium text-foreground text-center mb-5">{data.serviceLabel}</p>

            {data.requiresPasscode && passcode === null ? (
              <PasscodeGate onContinue={setPasscode} />
            ) : (
              <PublicCheckInForm
                token={token}
                passcode={passcode ?? undefined}
                onWrongCode={data.requiresPasscode ? () => setPasscode(null) : undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
