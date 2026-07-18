import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Member } from '@/lib/types';

interface GraduationQueueResponse {
  members: (Pick<Member, 'id' | 'full_name' | 'student_id' | 'level' | 'status' | 'local_id' | 'wing_id'> & {
    expected_graduation: string;
  })[];
  count: number;
}

export function useGraduationQueue() {
  return useQuery({
    queryKey: ['members', 'graduation-queue'],
    queryFn: () => apiFetch<GraduationQueueResponse>('/api/members/graduation-queue'),
  });
}
