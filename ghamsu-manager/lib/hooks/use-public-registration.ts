import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { PublicRegistrationFormData } from '@/lib/types';

export function usePublicRegistrationForm(token: string) {
  return useQuery({
    queryKey: ['public-registration', token],
    queryFn: () => apiFetch<PublicRegistrationFormData>(`/api/register/${token}`),
    retry: false,
  });
}

export function useSubmitPublicRegistration(token: string) {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ ok: true }>(`/api/register/${token}`, { method: 'POST', body: JSON.stringify(body) }),
  });
}
