'use client';
import { use } from 'react';
import { usePublicCheckInInfo } from '@/lib/hooks/use-public-checkin';
import { ApiClientError } from '@/lib/api-client';
import { PublicCheckInForm } from '@/components/attendance/public-checkin-form';
import { Logo } from '@/components/shared/logo';

export default function PublicCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, isLoading, error } = usePublicCheckInInfo(token);

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
            <PublicCheckInForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
