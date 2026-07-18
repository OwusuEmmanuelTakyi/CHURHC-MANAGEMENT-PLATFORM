import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { UpcomingBirthday } from '@/lib/types';

export function useBirthdaysThisWeek() {
  return useQuery({
    queryKey: ['members', 'birthdays-this-week'],
    queryFn: () => apiFetch<{ members: UpcomingBirthday[] }>('/api/members/birthdays-this-week'),
    select: (d) => d.members,
  });
}
