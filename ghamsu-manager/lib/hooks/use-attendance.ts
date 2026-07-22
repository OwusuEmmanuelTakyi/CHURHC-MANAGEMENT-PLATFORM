import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { ServiceSummary, AttendanceCheckIn, ServiceType, AttendanceLinksResponse, CreatedAttendanceLink } from '@/lib/types';

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

export function useAttendanceLinks(serviceId: number) {
  return useQuery({
    queryKey: ['attendance-links', serviceId],
    queryFn: () => apiFetch<AttendanceLinksResponse>(`/api/services/${serviceId}/attendance-link`),
  });
}

export function useCreateAttendanceLink(serviceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: 'self' | 'usher'; label?: string | null }) =>
      apiFetch<CreatedAttendanceLink>(`/api/services/${serviceId}/attendance-link`, {
        method: 'POST', body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-links', serviceId] }),
  });
}

export function useRevokeAttendanceLink(serviceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<{ ok: true }>(`/api/services/${serviceId}/attendance-link`, {
        method: 'PATCH', body: JSON.stringify({ token }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-links', serviceId] }),
  });
}
