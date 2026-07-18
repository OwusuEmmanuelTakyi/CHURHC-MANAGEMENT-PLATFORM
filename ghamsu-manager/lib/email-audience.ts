import { db } from './supabase/server';
import { ApiError } from './rbac';

export interface AudienceFilter {
  type: 'all' | 'local' | 'wing' | 'class' | 'executives' | 'specific_members';
  ids: number[];
}

// Derived from the blast's own local_id, not the live caller — a blast's audience
// is always resolved against the scope it was created in, regardless of who
// triggers the actual send (president, approver, or the cron scheduler).
export interface AudienceScope {
  national: boolean;
  localId: number | null;
}

export interface ResolvedAudience {
  recipients: { member_id: number; email: string }[];
  skippedCount: number;
}

export async function resolveAudience(scope: AudienceScope, filter: AudienceFilter): Promise<ResolvedAudience> {
  let q = db.from('members').select('id, email').is('deleted_at', null);

  switch (filter.type) {
    case 'all':
      break;
    case 'local':
      if (scope.national && filter.ids.length > 0) q = q.in('local_id', filter.ids);
      break;
    case 'wing':
      q = q.in('wing_id', filter.ids);
      break;
    case 'class':
      q = q.in('class_id', filter.ids);
      break;
    case 'executives':
      q = q.eq('status', 'executive');
      if (scope.national && filter.ids.length > 0) q = q.in('local_id', filter.ids);
      break;
    case 'specific_members':
      q = q.in('id', filter.ids);
      break;
    default:
      throw new ApiError(422, 'Invalid audience type');
  }

  // The intersection with sender scope is never skipped, even for a national blast
  // targeting a 'wing'/'class' that happens not to belong to the caller's local —
  // Postgres just returns zero rows for that case, which is the correct outcome.
  if (!scope.national) {
    q = q.eq('local_id', scope.localId);
  }

  const { data, error } = await q;
  if (error) throw new ApiError(500, error.message);

  const seen = new Map<number, string | null>();
  for (const m of data ?? []) seen.set(m.id, m.email);

  const recipients: { member_id: number; email: string }[] = [];
  let skippedCount = 0;
  for (const [id, email] of seen) {
    if (email) recipients.push({ member_id: id, email });
    else skippedCount++;
  }

  return { recipients, skippedCount };
}
