import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { ExecutiveAccount, Role } from '@/lib/types';

export function useExecutives() {
  return useQuery({
    queryKey: ['executives'],
    queryFn: () => apiFetch<{ executives: ExecutiveAccount[] }>('/api/executives'),
    select: (d) => d.executives,
  });
}

export interface CreateExecutiveBody {
  name: string;
  phone: string;
  email: string;
  role_type: Role;
  local_id?: number | null;
}

export function useCreateExecutive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExecutiveBody) =>
      apiFetch<{ id: string; email: string; tempPassword: string }>('/api/executives', {
        method: 'POST', body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executives'] }),
  });
}

export function useDeactivateExecutive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiFetch<{ ok: true }>(`/api/executives/${assignmentId}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executives'] }),
  });
}

export function useActivateExecutive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiFetch<{ ok: true; tempPassword: string }>(`/api/executives/${assignmentId}/activate`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executives'] }),
  });
}
