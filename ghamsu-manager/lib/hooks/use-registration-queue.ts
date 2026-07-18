import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { MemberRegistration } from '@/lib/types';

export function useRegistrationQueue() {
  return useQuery({
    queryKey: ['registration-queue'],
    queryFn: () => apiFetch<{ registrations: MemberRegistration[] }>('/api/registration/queue'),
    select: (d) => d.registrations,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['registration-queue'] });
  qc.invalidateQueries({ queryKey: ['members'] });
}

export function useApproveRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode }: { id: number; mode: 'create' | 'merge' }) =>
      apiFetch<{ ok: true; memberId: number }>(`/api/registration/queue/${id}/approve`, {
        method: 'POST', body: JSON.stringify({ mode }),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useRejectRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/registration/queue/${id}/reject`, { method: 'POST' }),
    onSuccess: () => invalidate(qc),
  });
}
