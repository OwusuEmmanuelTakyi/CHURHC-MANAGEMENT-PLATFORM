'use client';
import { useRef, useState } from 'react';
import { useUploadDocument } from '@/lib/hooks/use-documents';
import { DOCUMENT_TYPES } from '@/lib/documents';
import type { DocumentType } from '@/lib/types';

export function UploadForm({ onDone }: { onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('minutes');
  const [error, setError] = useState('');
  const upload = useUploadDocument();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setError('Choose a file'); return; }
    try {
      await upload.mutateAsync({ file, documentType });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <label className="text-sm flex flex-col gap-1 text-foreground">
        Document type
        <select
          className="border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
        >
          {DOCUMENT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </label>
      <label className="text-sm flex flex-col gap-1 text-foreground">
        File (PDF, DOCX, or XLSX — max 25MB)
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="text-sm text-foreground"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={upload.isPending} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50">
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
