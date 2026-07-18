import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { AuditLogEntry } from '@/lib/types';

interface AuditPage { logs: AuditLogEntry[]; nextCursor: number | null; }

export function useAuditFeed() {
  return useInfiniteQuery({
    queryKey: ['audit'],
    queryFn: ({ pageParam }) =>
      apiFetch<AuditPage>(`/api/audit?limit=50${pageParam ? `&before=${pageParam}` : ''}`),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
