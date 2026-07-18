import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiUpload } from '@/lib/api-client';
import type { ImportUploadResponse, ImportConfirmResponse } from '@/lib/types';

export function useImportUpload() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiUpload<ImportUploadResponse>('/api/members/import', formData);
    },
  });
}

export function useImportConfirm(jobId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decisions: Record<string, 'skip' | 'merge'>) =>
      apiFetch<ImportConfirmResponse>(`/api/members/import/${jobId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ decisions }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}
