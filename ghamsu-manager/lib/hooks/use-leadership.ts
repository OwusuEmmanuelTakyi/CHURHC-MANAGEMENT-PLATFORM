import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { LeadershipPositionsResponse, HandoverResult, PositionScope } from '@/lib/types';

export function useLeadershipPositions(academicYear: string) {
  return useQuery({
    queryKey: ['leadership', 'positions', academicYear],
    queryFn: () => apiFetch<LeadershipPositionsResponse>(`/api/leadership/positions?academic_year=${encodeURIComponent(academicYear)}`),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['leadership'] });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; scope: PositionScope; wing_id?: number | null }) =>
      apiFetch<{ id: number }>('/api/leadership/positions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      apiFetch<{ ok: true }>(`/api/leadership/positions/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/leadership/positions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAssignPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { position_id: number; member_id: number; academic_year?: string }) =>
      apiFetch<{ id: number }>('/api/leadership/assignments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useEndAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/leadership/assignments/${id}`, { method: 'PATCH' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignments: { position_id: number; member_id: number }[]) =>
      apiFetch<HandoverResult>('/api/leadership/handover', { method: 'POST', body: JSON.stringify({ assignments }) }),
    onSuccess: () => invalidateAll(qc),
  });
}
