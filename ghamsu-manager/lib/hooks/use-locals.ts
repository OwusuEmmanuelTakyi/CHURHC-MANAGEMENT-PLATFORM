import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Local, LocalDetail } from '@/lib/types';

export function useLocals() {
  return useQuery({
    queryKey: ['locals'],
    queryFn: () => apiFetch<{ locals: Local[] }>('/api/locals'),
    select: (d) => d.locals,
  });
}

export function useLocalDetail(id: number) {
  return useQuery({
    queryKey: ['local', id],
    queryFn: () => apiFetch<LocalDetail>(`/api/locals/${id}`),
  });
}

export function useCreateLocal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; short_code: string; university_name: string }) =>
      apiFetch<{ id: number }>('/api/locals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locals'] }),
  });
}

export function useUpdateLocal(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; university_name?: string; active?: boolean }) =>
      apiFetch<{ ok: true }>(`/api/locals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locals'] });
      qc.invalidateQueries({ queryKey: ['local', id] });
    },
  });
}

export function useCreateWing(localId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ id: number }>('/api/wings', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local', localId] });
      qc.invalidateQueries({ queryKey: ['wings'] });
    },
  });
}

export function useUpdateWing(localId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch<{ ok: true }>(`/api/wings/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local', localId] });
      qc.invalidateQueries({ queryKey: ['wings'] });
    },
  });
}

export function useCreateClass(localId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ id: number }>('/api/classes', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local', localId] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useUpdateClass(localId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch<{ ok: true }>(`/api/classes/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local', localId] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
