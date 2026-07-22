import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { PublicCheckInInfo, CheckInResult } from '@/lib/types';

export function usePublicCheckInInfo(token: string) {
  return useQuery({
    queryKey: ['public-checkin', token],
    queryFn: () => apiFetch<PublicCheckInInfo>(`/api/checkin/${token}`),
    retry: false,
  });
}

export function useSubmitCheckIn(token: string) {
  return useMutation({
    mutationFn: (student_id: string) =>
      apiFetch<CheckInResult>(`/api/checkin/${token}`, { method: 'POST', body: JSON.stringify({ student_id }) }),
  });
}
