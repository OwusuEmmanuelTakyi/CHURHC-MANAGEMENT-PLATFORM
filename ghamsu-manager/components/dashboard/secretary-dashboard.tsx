'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FileText, AlertTriangle } from 'lucide-react';
import { useSecretaryDashboard } from '@/lib/hooks/use-dashboard';
import { UploadForm } from '@/components/documents/upload-form';
import { StatCard } from './stat-card';
import { BirthdaysCard } from './birthdays-card';
import { RegistrationLinkWidget } from '@/components/registration/registration-link-widget';

const TYPE_COLORS: Record<string, string> = {
  minutes: 'text-chart-3',
  report: 'text-chart-4',
  constitution: 'text-chart-6',
  handover: 'text-chart-2',
  other: 'text-muted-foreground',
};

export function SecretaryDashboard() {
  const { data, isLoading, error } = useSecretaryDashboard();
  const [showUpload, setShowUpload] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Failed to load'}</p>;

  return (
    <div className="space-y-6">
      <RegistrationLinkWidget />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Documents" value={String(data.stats.documentsCount)} />
        <StatCard label="Pending Upload" value={String(data.stats.pendingUploadCount)} />
        <StatCard label="Members" value={String(data.stats.membersCount)} />
        <StatCard label="Audit Events" value={String(data.stats.auditEventsThisWeek)} note="this week" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-foreground">Recent documents</h2>
            <button onClick={() => setShowUpload((v) => !v)} className="rounded-lg bg-primary text-white text-xs px-2.5 py-1.5">
              Upload document
            </button>
          </div>

          {showUpload && (
            <div className="mb-3">
              <UploadForm onDone={() => setShowUpload(false)} />
            </div>
          )}

          {data.recentDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentDocuments.map((doc) => (
                <li key={doc.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <FileText size={16} className={TYPE_COLORS[doc.document_type] ?? TYPE_COLORS.other} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {doc.document_type} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full text-xs px-2 py-0.5 shrink-0 ${
                    doc.status === 'approved' ? 'bg-chart-4/15 text-chart-4' : 'bg-chart-5/15 text-chart-5'
                  }`}>
                    {doc.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">Audit log feed</h2>
          {data.recentAuditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentAuditEvents.map((ev) => (
                <li key={ev.id} className="text-sm">
                  <p className="text-foreground">{ev.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.actorName ?? 'Unknown'} · {new Date(ev.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <BirthdaysCard />

      {data.monthsMissingMinutes.length > 0 && (
        <Link
          href="/documents"
          className="flex items-start gap-3 rounded-xl border border-chart-5/30 bg-chart-5/10 p-4 hover:bg-chart-5/15"
        >
          <AlertTriangle size={18} className="text-chart-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Meeting minutes pending upload</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              No minutes uploaded for: {data.monthsMissingMinutes.join(', ')}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
