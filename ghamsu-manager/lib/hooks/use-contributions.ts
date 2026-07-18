import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Contribution, ContributionsSummary } from '@/lib/types';

export interface ContributionFilters {
  member_id?: number;
  academic_year?: string;
  semester?: string;
  payment_method?: string;
}

function buildQuery(filters: ContributionFilters) {
  const params = new URLSearchParams();
  if (filters.member_id) params.set('member_id', String(filters.member_id));
  if (filters.academic_year) params.set('academic_year', filters.academic_year);
  if (filters.semester) params.set('semester', filters.semester);
  if (filters.payment_method) params.set('payment_method', filters.payment_method);
  return params.toString();
}

export function useContributions(filters: ContributionFilters) {
  return useQuery({
    queryKey: ['contributions', filters],
    queryFn: () => apiFetch<{ contributions: Contribution[] }>(`/api/contributions?${buildQuery(filters)}`),
    select: (d) => d.contributions,
  });
}

export function useContributionsSummary(academicYear: string) {
  return useQuery({
    queryKey: ['contributions', 'summary', academicYear],
    queryFn: () => apiFetch<ContributionsSummary>(`/api/contributions/summary?academic_year=${encodeURIComponent(academicYear)}`),
  });
}

export function useRecordContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      member_id: number; amount_pesewas: number; payment_method: 'momo' | 'cash';
      momo_reference?: string | null; receipt_note?: string | null; semester: 'first' | 'second';
    }) => apiFetch<{ id: number }>('/api/contributions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions'] });
      qc.invalidateQueries({ queryKey: ['members'] }); // dues_paid column depends on this
    },
  });
}
