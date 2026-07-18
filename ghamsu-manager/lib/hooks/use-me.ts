import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { MeResponse } from '@/lib/types';

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<MeResponse>('/api/auth/me'),
  });
}
