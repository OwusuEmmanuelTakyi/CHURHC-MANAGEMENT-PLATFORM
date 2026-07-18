import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  AudienceFilterValue, EmailBlastSummary, EmailBlastReport, EstimateResult,
} from '@/lib/types';

export function useEstimateAudience() {
  return useMutation({
    mutationFn: (audienceFilter: AudienceFilterValue) =>
      apiFetch<EstimateResult>('/api/email/estimate', { method: 'POST', body: JSON.stringify({ audienceFilter }) }),
  });
}

export function useBlasts() {
  return useQuery({
    queryKey: ['email', 'blasts'],
    queryFn: () => apiFetch<{ blasts: EmailBlastSummary[] }>('/api/email/blasts'),
    select: (d) => d.blasts,
  });
}

export function useBlastDetail(id: number | null) {
  return useQuery({
    queryKey: ['email', 'blast', id],
    queryFn: () => apiFetch<EmailBlastReport>(`/api/email/blasts/${id}`),
    enabled: id !== null,
  });
}

function invalidateBlasts(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['email'] });
}

export function useCreateBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; body: string; audienceFilter: AudienceFilterValue; scheduledAt?: string | null }) =>
      apiFetch<{ id: number }>('/api/email/blasts', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateBlasts(qc),
  });
}

export function useSubmitBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/email/blasts/${id}/submit`, { method: 'POST' }),
    onSuccess: () => invalidateBlasts(qc),
  });
}

export function useSendBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/email/blasts/${id}/send`, { method: 'POST' }),
    onSuccess: () => invalidateBlasts(qc),
  });
}

export function useApproveBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/email/blasts/${id}/approve`, { method: 'POST' }),
    onSuccess: () => invalidateBlasts(qc),
  });
}
