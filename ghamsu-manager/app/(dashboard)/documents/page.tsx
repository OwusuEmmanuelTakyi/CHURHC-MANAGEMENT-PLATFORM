'use client';
import { useState } from 'react';
import { useMe } from '@/lib/hooks/use-me';
import { useDocuments, type DocumentFilters } from '@/lib/hooks/use-documents';
import { DOCUMENT_TYPES } from '@/lib/documents';
import { DocumentsTable } from '@/components/documents/documents-table';
import { UploadForm } from '@/components/documents/upload-form';

const FIELD_CLASS = 'border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground';

export default function DocumentsPage() {
  const { data: me } = useMe();
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [showUpload, setShowUpload] = useState(false);
  const { data: documents, isLoading, error } = useDocuments(filters);

  const canManage = me?.permissions.includes('documents.manage') ?? false;
  const canApprove = me?.permissions.includes('documents.approve') ?? false;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
        {canManage && (
          <button onClick={() => setShowUpload((v) => !v)} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
            Upload document
          </button>
        )}
      </div>

      {showUpload && (
        <div className="mb-4">
          <UploadForm onDone={() => setShowUpload(false)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className={FIELD_CLASS}
          value={filters.document_type ?? ''}
          onChange={(e) => setFilters({ ...filters, document_type: e.target.value || undefined })}
        >
          <option value="">All types</option>
          {DOCUMENT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select
          className={FIELD_CLASS}
          value={filters.status ?? ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {documents && <DocumentsTable documents={documents} canApprove={canApprove} />}
    </div>
  );
}
