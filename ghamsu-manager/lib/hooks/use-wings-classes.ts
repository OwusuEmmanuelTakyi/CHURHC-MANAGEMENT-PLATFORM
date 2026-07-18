import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Wing, SchoolClass } from '@/lib/types';

export function useWings(localId?: number | null) {
  return useQuery({
    queryKey: ['wings', localId ?? 'own'],
    queryFn: () => apiFetch<{ wings: Wing[] }>(`/api/wings${localId ? `?local_id=${localId}` : ''}`),
    select: (d) => d.wings,
  });
}

export function useClasses(localId?: number | null) {
  return useQuery({
    queryKey: ['classes', localId ?? 'own'],
    queryFn: () => apiFetch<{ classes: SchoolClass[] }>(`/api/classes${localId ? `?local_id=${localId}` : ''}`),
    select: (d) => d.classes,
  });
}
