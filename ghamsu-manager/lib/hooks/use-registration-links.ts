import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { RegistrationLink } from '@/lib/types';

export function useRegistrationLinks() {
  return useQuery({
    queryKey: ['registration-links'],
    queryFn: () => apiFetch<{ links: RegistrationLink[] }>('/api/registration-links'),
    select: (d) => d.links,
  });
}

export function useCreateRegistrationLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expiresAt?: string | null) =>
      apiFetch<{ token: string }>('/api/registration-links', {
        method: 'POST', body: JSON.stringify({ expires_at: expiresAt ?? null }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registration-links'] }),
  });
}

export function useDeactivateRegistrationLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => apiFetch<{ ok: true }>(`/api/registration-links/${token}`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registration-links'] }),
  });
}
