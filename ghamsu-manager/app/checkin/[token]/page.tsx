'use client';
import { use, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { usePublicCheckInInfo } from '@/lib/hooks/use-public-checkin';
import { ApiClientError } from '@/lib/api-client';
import { PublicCheckInForm } from '@/components/attendance/public-checkin-form';
import { OtpInput } from '@/components/attendance/otp-input';
import { Logo } from '@/components/shared/logo';

function PasscodeGate({ error, onComplete }: { error: string; onComplete: (passcode: string) => void }) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <KeyRound size={20} />
      </div>
      <p className="text-sm text-muted-foreground text-center -mt-1">
        This link is for ushers. Enter the access code you were given — just once, then check in as many people as you like.
      </p>
      <OtpInput onComplete={onComplete} />
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-3 w-2/3 mx-auto rounded bg-muted" />
      <div className="h-4 w-1/2 mx-auto rounded bg-muted" />
      <div className="h-12 w-full rounded-lg bg-muted mt-4" />
      <div className="h-12 w-full rounded-lg bg-muted" />
    </div>
  );
}

export default function PublicCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, isLoading, error } = usePublicCheckInInfo(token);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState('');

  function handleWrongCode() {
    setPasscode(null);
    setPasscodeError('Incorrect code — try again.');
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-80 w-80 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--primary)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--accent)' }}
      />

      <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-xl border border-border p-6 animate-fade-in-up">
        <h1 className="flex items-center justify-center gap-2 text-xl font-semibold text-center text-primary mb-1">
          <Logo size={32} />
          GHAMSU Manager
        </h1>

        {isLoading && <div className="mt-6"><LoadingCard /></div>}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">
              {error instanceof ApiClientError ? error.message : 'This check-in link is no longer available.'}
            </p>
          </div>
        )}

        {data && (
          <>
            <div className="flex flex-col items-center gap-1 mb-5">
              <span className="text-xs font-medium text-muted-foreground">{data.localName}</span>
              <span className="rounded-full bg-secondary text-foreground text-xs font-medium px-3 py-1">
                {data.serviceLabel}
              </span>
            </div>

            {data.requiresPasscode && passcode === null ? (
              <PasscodeGate
                error={passcodeError}
                onComplete={(code) => { setPasscode(code); setPasscodeError(''); }}
              />
            ) : (
              <PublicCheckInForm
                token={token}
                passcode={passcode ?? undefined}
                rememberId={!data.requiresPasscode}
                onWrongCode={data.requiresPasscode ? handleWrongCode : undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
