import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { NationalDashboardData, LocalDashboardData, TreasurerDashboardData, SecretaryDashboardData } from '@/lib/types';

export function useNationalDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'national'],
    queryFn: () => apiFetch<NationalDashboardData>('/api/dashboard/national'),
  });
}

export function useLocalDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'local'],
    queryFn: () => apiFetch<LocalDashboardData>('/api/dashboard/local'),
  });
}

export function useTreasurerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'treasurer'],
    queryFn: () => apiFetch<TreasurerDashboardData>('/api/dashboard/treasurer'),
  });
}

export function useSecretaryDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'secretary'],
    queryFn: () => apiFetch<SecretaryDashboardData>('/api/dashboard/secretary'),
  });
}
