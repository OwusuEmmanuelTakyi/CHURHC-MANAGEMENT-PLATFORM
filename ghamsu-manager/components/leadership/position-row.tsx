'use client';
import { useState } from 'react';
import { useAssignPosition, useEndAssignment, useUpdatePosition, useDeletePosition } from '@/lib/hooks/use-leadership';
import { MemberPicker } from '@/components/shared/member-picker';
import type { LeadershipPosition } from '@/lib/types';

const SCOPE_LABELS: Record<string, string> = { national: 'National', local: 'Local', wing: 'Wing' };

export function PositionRow({ position, isCurrentYear, canManage }: {
  position: LeadershipPosition;
  isCurrentYear: boolean;
  canManage: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(position.title);
  const [assigning, setAssigning] = useState(false);
  const [pickedMemberId, setPickedMemberId] = useState<number | null>(null);
  const [pickedMemberName, setPickedMemberName] = useState<string | null>(null);

  const assign = useAssignPosition();
  const endAssignment = useEndAssignment();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  async function handleAssign() {
    if (!pickedMemberId) return;
    await assign.mutateAsync({ position_id: position.id, member_id: pickedMemberId });
    setAssigning(false);
    setPickedMemberId(null);
    setPickedMemberName(null);
  }

  const vacant = !position.assignment || position.assignment.end_date !== null;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                className="border border-border rounded-lg px-2 py-1 text-sm bg-input-background text-foreground"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
              />
              <button
                onClick={async () => { await updatePosition.mutateAsync({ id: position.id, title: titleDraft }); setRenaming(false); }}
                className="text-xs text-primary"
              >
                Save
              </button>
              <button onClick={() => { setTitleDraft(position.title); setRenaming(false); }} className="text-xs text-muted-foreground">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{position.title}</span>
              <span className="rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">
                {SCOPE_LABELS[position.scope]}{position.wing_name ? ` · ${position.wing_name}` : ''}
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {position.assignment ? position.assignment.member_name : 'Vacant'}
            {position.assignment?.end_date ? ` (ended ${position.assignment.end_date})` : ''}
          </p>
        </div>

        {!renaming && canManage && (
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setRenaming(true)} className="text-xs text-muted-foreground hover:text-foreground">
              Rename
            </button>
            {vacant && (
              <button onClick={() => setAssigning((v) => !v)} className="text-xs text-primary font-medium">
                Assign
              </button>
            )}
            {!vacant && isCurrentYear && (
              <button
                onClick={() => endAssignment.mutate(position.assignment!.id)}
                disabled={endAssignment.isPending}
                className="text-xs text-destructive"
              >
                End term
              </button>
            )}
            {vacant && isCurrentYear && (
              <button
                onClick={() => deletePosition.mutate(position.id)}
                disabled={deletePosition.isPending}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {canManage && assigning && (
        <div className="mt-2 flex items-center gap-2">
          <MemberPicker
            selectedName={pickedMemberName}
            onSelect={(id, name) => { setPickedMemberId(id); setPickedMemberName(name); }}
            onClear={() => { setPickedMemberId(null); setPickedMemberName(null); }}
          />
          <button
            onClick={handleAssign}
            disabled={!pickedMemberId || assign.isPending}
            className="rounded-lg bg-primary text-white text-xs px-3 py-1 disabled:opacity-50"
          >
            Confirm
          </button>
          <button onClick={() => setAssigning(false)} className="text-xs text-muted-foreground">Cancel</button>
        </div>
      )}
    </li>
  );
}
