import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Member, MemberDetail, MemberHistoryEntry } from '@/lib/types';

export interface MemberFilters {
  status?: string;
  wing_id?: number;
  level?: number;
  q?: string;
}

interface MembersPage { members: Member[]; nextCursor: number | null; }

function buildQuery(filters: MemberFilters, after: number, limit = 25) {
  const params = new URLSearchParams({ after: String(after), limit: String(limit) });
  if (filters.status) params.set('status', filters.status);
  if (filters.wing_id) params.set('wing_id', String(filters.wing_id));
  if (filters.level) params.set('level', String(filters.level));
  if (filters.q) params.set('q', filters.q);
  return params.toString();
}

export function useInfiniteMembers(filters: MemberFilters) {
  return useInfiniteQuery({
    queryKey: ['members', filters],
    queryFn: ({ pageParam }) => apiFetch<MembersPage>(`/api/members?${buildQuery(filters, pageParam)}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useMemberSearch(q: string) {
  return useQuery({
    queryKey: ['members', 'search', q],
    queryFn: () => apiFetch<MembersPage>(`/api/members?after=0&limit=6&q=${encodeURIComponent(q)}`),
    select: (d) => d.members,
    enabled: q.trim().length >= 2,
  });
}

export function useMember(id: number | null) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => apiFetch<{ member: MemberDetail; history: MemberHistoryEntry[] }>(`/api/members/${id}`),
    enabled: id !== null,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ id: number }>('/api/members', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useUpdateMember(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ ok: true }>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['member', id] });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}
