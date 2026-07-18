'use client';
import { use } from 'react';
import { usePublicRegistrationForm } from '@/lib/hooks/use-public-registration';
import { ApiClientError } from '@/lib/api-client';
import { PublicRegistrationForm } from '@/components/registration/public-form';

export default function PublicRegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, isLoading, error } = usePublicRegistrationForm(token);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold text-center text-primary mb-1">GHAMSU Manager</h1>

        {isLoading && <p className="text-sm text-muted-foreground text-center mt-4">Loading…</p>}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">
              {error instanceof ApiClientError ? error.message : 'This registration link is no longer available.'}
            </p>
          </div>
        )}

        {data && (
          <>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Register with {data.localName}
            </p>
            <PublicRegistrationForm token={token} data={data} />
          </>
        )}
      </div>
    </div>
  );
}
