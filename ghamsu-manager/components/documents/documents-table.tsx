'use client';
import { useApproveDocument, downloadDocument } from '@/lib/hooks/use-documents';
import type { DocumentRecord } from '@/lib/types';

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTable({ documents, canApprove }: { documents: DocumentRecord[]; canApprove: boolean }) {
  const approve = useApproveDocument();

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No documents yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Year</th>
            <th className="px-3 py-2 font-medium">Size</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Uploaded by</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {documents.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2 whitespace-nowrap text-foreground">{d.name}</td>
              <td className="px-3 py-2 text-muted-foreground capitalize">{d.document_type}</td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{d.academic_year}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatSize(d.file_size_bytes)}</td>
              <td className="px-3 py-2">
                {d.status === 'approved' ? (
                  <span className="rounded-full bg-chart-4/15 text-chart-4 px-2 py-0.5 text-xs font-medium">Approved</span>
                ) : (
                  <span className="rounded-full bg-chart-5/15 text-chart-5 px-2 py-0.5 text-xs font-medium">Pending</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{d.uploaded_by_name ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <button onClick={() => downloadDocument(d.id)} className="text-primary text-xs font-medium">
                    Download
                  </button>
                  {canApprove && d.status === 'pending' && (
                    <button
                      onClick={() => approve.mutate(d.id)}
                      disabled={approve.isPending}
                      className="text-xs text-chart-4 font-medium disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
