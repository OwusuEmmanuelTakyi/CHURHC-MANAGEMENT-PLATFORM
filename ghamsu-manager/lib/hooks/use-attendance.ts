import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { ServiceSummary, AttendanceCheckIn, ServiceType } from '@/lib/types';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => apiFetch<{ services: ServiceSummary[] }>('/api/services'),
    select: (d) => d.services,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { service_date?: string; service_type: ServiceType; title?: string | null }) =>
      apiFetch<{ id: number }>('/api/services', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useAttendanceCheckIn(serviceId: number) {
  return useQuery({
    queryKey: ['attendance', serviceId],
    queryFn: () => apiFetch<AttendanceCheckIn>(`/api/services/${serviceId}/attendance`),
  });
}

export function useToggleAttendance(serviceId: number) {
  const qc = useQueryClient();
  const key = ['attendance', serviceId];

  return useMutation({
    mutationFn: (body: { member_id: number; present: boolean }) =>
      apiFetch<{ ok: true }>(`/api/services/${serviceId}/attendance`, { method: 'POST', body: JSON.stringify(body) }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AttendanceCheckIn>(key);
      if (previous) {
        const members = previous.members.map((m) => (m.id === body.member_id ? { ...m, present: body.present } : m));
        qc.setQueryData<AttendanceCheckIn>(key, {
          ...previous, members, presentCount: members.filter((m) => m.present).length,
        });
      }
      return { previous };
    },
    onError: (_err, _body, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useAttendanceLink(serviceId: number) {
  return useQuery({
    queryKey: ['attendance-link', serviceId],
    queryFn: () => apiFetch<{ token: string | null }>(`/api/services/${serviceId}/attendance-link`),
  });
}

export function useCreateAttendanceLink(serviceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ token: string }>(`/api/services/${serviceId}/attendance-link`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-link', serviceId] }),
  });
}

export function useRevokeAttendanceLink(serviceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(`/api/services/${serviceId}/attendance-link`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-link', serviceId] }),
  });
}
