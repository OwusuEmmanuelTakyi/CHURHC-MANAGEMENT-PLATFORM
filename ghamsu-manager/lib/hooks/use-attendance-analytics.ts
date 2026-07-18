import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { LocalAttendanceAnalytics, NationalAttendanceRow } from '@/lib/types';

export function useLocalAnalytics(missedThreshold: number) {
  return useQuery({
    queryKey: ['attendance-analytics', missedThreshold],
    queryFn: () => apiFetch<LocalAttendanceAnalytics>(`/api/attendance/analytics?missedThreshold=${missedThreshold}`),
  });
}

export function useRemindAbsentees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: number[]) =>
      apiFetch<{ status: string; recipientCount?: number; skippedCount?: number }>('/api/attendance/remind-absentees', {
        method: 'POST', body: JSON.stringify({ memberIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-blasts'] }),
  });
}

export function useNationalAnalytics() {
  return useQuery({
    queryKey: ['attendance-analytics', 'national'],
    queryFn: () => apiFetch<{ locals: NationalAttendanceRow[] }>('/api/attendance/analytics/national'),
    select: (d) => d.locals,
  });
}
