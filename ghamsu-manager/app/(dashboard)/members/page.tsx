'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMe } from '@/lib/hooks/use-me';
import { useInfiniteMembers, useDeleteMember, useMember, type MemberFilters } from '@/lib/hooks/use-members';
import { MemberFiltersBar } from '@/components/members/member-filters';
import { MembersTable } from '@/components/members/members-table';
import { MemberDrawer } from '@/components/members/member-drawer';
import { MemberFormDialog } from '@/components/members/member-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RegistrationLinkWidget } from '@/components/registration/registration-link-widget';

export default function MembersPage() {
  const { data: me } = useMe();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MemberFilters>(() => {
    const q = searchParams.get('q');
    return q ? { q } : {};
  });
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMembers(filters);
  const deleteMember = useDeleteMember();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const canEdit = me?.permissions.includes('members.edit') ?? false;
  const canImport = me?.permissions.includes('members.import') ?? false;
  const canExport = me?.permissions.includes('members.export') ?? false;
  const canManageRegistration = me?.permissions.includes('registration.manage') ?? false;
  const members = data?.pages.flatMap((p) => p.members) ?? [];

  function exportUrl(format: 'csv' | 'xlsx') {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.wing_id) params.set('wing_id', String(filters.wing_id));
    if (filters.level) params.set('level', String(filters.level));
    if (filters.q) params.set('q', filters.q);
    params.set('format', format);
    return `/api/members/export?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-semibold text-foreground">Members</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {canExport && (
            <>
              <a
                href={exportUrl('csv')}
                className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5"
              >
                Export CSV
              </a>
              <a
                href={exportUrl('xlsx')}
                className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5"
              >
                Export Excel
              </a>
            </>
          )}
          {canImport && (
            <Link
              href="/members/import"
              className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5"
            >
              Import
            </Link>
          )}
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-primary text-white text-sm px-3 py-1.5"
            >
              Add member
            </button>
          )}
        </div>
      </div>

      {canManageRegistration && (
        <div className="mb-4">
          <RegistrationLinkWidget />
        </div>
      )}

      <div className="mb-4">
        <MemberFiltersBar filters={filters} onChange={setFilters} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {!isLoading && !error && (
        <MembersTable members={members} onSelect={setSelectedId} showDues={me?.activeRole.role === 'treasurer'} />
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-lg border border-border text-foreground px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {selectedId !== null && (
        <MemberDrawer
          memberId={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setEditId(selectedId); }}
          onDelete={() => { setDeleteId(selectedId); }}
        />
      )}

      {showCreate && me?.activeRole.localId && (
        <MemberFormDialog mode="create" localId={me.activeRole.localId} onClose={() => setShowCreate(false)} />
      )}

      {editId !== null && (
        <EditDialog memberId={editId} localId={me?.activeRole.localId ?? 0} onClose={() => setEditId(null)} />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remove member"
        description="This soft-deletes the member — they'll disappear from active rosters but their history is preserved."
        confirmLabel="Remove"
        busy={deleteMember.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId === null) return;
          await deleteMember.mutateAsync(deleteId);
          setDeleteId(null);
          setSelectedId(null);
        }}
      />
    </div>
  );
}

// Fetches the full member record before handing off to the shared form dialog in edit mode.
function EditDialog({ memberId, localId, onClose }: { memberId: number; localId: number; onClose: () => void }) {
  const { data } = useMember(memberId);
  if (!data) return null;
  return <MemberFormDialog mode="edit" localId={localId} member={data.member} onClose={onClose} />;
}
