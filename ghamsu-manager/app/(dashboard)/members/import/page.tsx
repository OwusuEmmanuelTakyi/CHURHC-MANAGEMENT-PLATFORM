'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/lib/hooks/use-me';
import { useImportUpload, useImportConfirm } from '@/lib/hooks/use-members-import';
import { ApiClientError } from '@/lib/api-client';
import type { ImportUploadResponse, ImportConfirmResponse } from '@/lib/types';

type Step = 'upload' | 'review' | 'done';

const RESOLUTION_LABELS: Record<string, string> = {
  duplicate_in_file: 'Duplicate in file',
  duplicate_existing: 'Already a member',
  invalid: 'Invalid',
};

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function MembersImportPage() {
  const { data: me } = useMe();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useImportUpload();
  const [step, setStep] = useState<Step>('upload');
  const [uploadResult, setUploadResult] = useState<ImportUploadResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<string, 'skip' | 'merge'>>({});
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportConfirmResponse | null>(null);
  const confirm = useImportConfirm(uploadResult?.jobId ?? null);

  if (me && !me.permissions.includes('members.import')) {
    return <p className="text-sm text-destructive">You don&apos;t have permission to import members.</p>;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setUploadError('Choose a file first.'); return; }
    setUploadError('');
    try {
      const res = await upload.mutateAsync(file);
      setUploadResult(res);
      setDecisions({});
      setStep('review');
    } catch (err) {
      setUploadError(err instanceof ApiClientError ? err.message : 'Upload failed');
    }
  }

  async function handleConfirm() {
    const res = await confirm.mutateAsync(decisions);
    setResult(res);
    setStep('done');
  }

  function resetWizard() {
    setUploadResult(null);
    setDecisions({});
    setResult(null);
    setUploadError('');
    setFileName('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-foreground">Import members</h1>
        <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground">
          Back to members
        </Link>
      </div>

      {step === 'upload' && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">1. Download the template</p>
            <p className="text-sm text-muted-foreground mt-1">
              Fill it in and keep the column headers unchanged — wing and class names must match
              what&apos;s already set up for your local.
            </p>
            <div className="mt-2 flex gap-4">
              {/* eslint-disable @next/next/no-html-link-for-pages -- file download from an API route, not an app page */}
              <a href="/api/members/import/template" className="text-sm text-primary font-medium">
                Download Excel template
              </a>
              <a href="/api/members/import/template?format=csv" className="text-sm text-primary font-medium">
                Download CSV template
              </a>
              {/* eslint-enable @next/next/no-html-link-for-pages */}
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-2">
            <p className="text-sm font-medium text-foreground">2. Upload your completed file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="text-sm text-foreground"
              onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? ''); setUploadError(''); }}
            />
            {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
            <div>
              <button
                type="submit"
                disabled={upload.isPending}
                className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {upload.isPending ? 'Uploading…' : 'Upload & review'}
              </button>
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
          </form>
        </div>
      )}

      {step === 'review' && uploadResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <StatTile label="Total rows" value={uploadResult.summary.total} />
            <StatTile label="New" value={uploadResult.summary.new} />
            <StatTile label="Dup. in file" value={uploadResult.summary.duplicateInFile} />
            <StatTile label="Already members" value={uploadResult.summary.duplicateExisting} />
            <StatTile label="Invalid" value={uploadResult.summary.invalid} />
            <StatTile label="Missing email" value={uploadResult.summary.missingEmail} />
          </div>

          {uploadResult.summary.missingEmail > 0 && (
            <p className="text-sm text-destructive">
              {uploadResult.summary.missingEmail} new member(s) have no email — they won&apos;t receive
              email alerts until one is added.
            </p>
          )}

          {uploadResult.reviewRows.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Issue</th>
                    <th className="px-3 py-2 font-medium">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {uploadResult.reviewRows.map((row) => (
                    <tr key={row.row_number}>
                      <td className="px-3 py-2 text-muted-foreground">{row.row_number}</td>
                      <td className="px-3 py-2 text-foreground">{String(row.raw_data['Full Name'] ?? '')}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.raw_data['Phone'] ?? '')}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.error_detail ?? RESOLUTION_LABELS[row.resolution]}
                      </td>
                      <td className="px-3 py-2">
                        {row.resolution === 'duplicate_existing' ? (
                          <select
                            className="border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground"
                            value={decisions[String(row.row_number)] ?? 'skip'}
                            onChange={(e) =>
                              setDecisions((d) => ({ ...d, [String(row.row_number)]: e.target.value as 'skip' | 'merge' }))
                            }
                          >
                            <option value="skip">Skip</option>
                            <option value="merge">Merge into existing</option>
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">Will be skipped</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={confirm.isPending}
              className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50"
            >
              {confirm.isPending ? 'Importing…' : `Import ${uploadResult.summary.new} new member(s)`}
            </button>
            <button onClick={resetWizard} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
              Start over
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Import complete</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile label="Imported" value={result.imported} />
            <StatTile label="Merged" value={result.merged} />
            <StatTile label="Skipped" value={result.skipped} />
            <StatTile label="Failed" value={result.failed} />
          </div>
          <div className="flex gap-2">
            <Link href="/members" className="rounded-lg bg-primary text-white text-sm px-3 py-1.5">
              Go to members
            </Link>
            <button onClick={resetWizard} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
