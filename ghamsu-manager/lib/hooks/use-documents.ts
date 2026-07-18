import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { supabase } from '@/lib/supabase/client';
import type { DocumentRecord, DocumentType } from '@/lib/types';

export interface DocumentFilters {
  document_type?: string;
  academic_year?: string;
  status?: string;
}

function buildQuery(filters: DocumentFilters) {
  const params = new URLSearchParams();
  if (filters.document_type) params.set('document_type', filters.document_type);
  if (filters.academic_year) params.set('academic_year', filters.academic_year);
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

export function useDocuments(filters: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => apiFetch<{ documents: DocumentRecord[] }>(`/api/documents?${buildQuery(filters)}`),
    select: (d) => d.documents,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: DocumentType }) => {
      const { token, path } = await apiFetch<{ signedUrl: string; token: string; path: string }>(
        '/api/documents/upload-url',
        { method: 'POST', body: JSON.stringify({ name: file.name, mime_type: file.type, file_size_bytes: file.size }) },
      );

      const { error } = await supabase.storage.from('documents').uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);

      return apiFetch<{ id: number }>('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: file.name, document_type: documentType, file_url: path,
          file_size_bytes: file.size, mime_type: file.type,
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useApproveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/documents/${id}/approve`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export async function downloadDocument(id: number) {
  const { url } = await apiFetch<{ url: string }>(`/api/documents/${id}/download`);
  window.open(url, '_blank');
}
