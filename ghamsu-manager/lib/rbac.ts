import { db } from '@/lib/supabase/server';
import { getSessionClient } from '@/lib/supabase/session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type Role = 'national_president' | 'local_president' | 'treasurer' | 'secretary';

export interface Ctx {
  userId: string;
  role: Role;
  localId: number | null;   // null only for national_president
  assignmentId: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getScopedContext(): Promise<Ctx> {
  const supabase = await getSessionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, 'Not authenticated');

  // All active roles this user holds
  const { data: roles, error } = await db
    .from('role_assignments')
    .select('id, role_type, local_id')
    .eq('user_id', user.id)
    .eq('active', true);
  if (error || !roles?.length) throw new ApiError(403, 'No active role');

  // Active role = the one in the cookie, else the first
  const cookieStore = await cookies();
  const wanted = Number(cookieStore.get('active_role')?.value);
  const active = roles.find(r => r.id === wanted) ?? roles[0];

  return {
    userId: user.id,
    role: active.role_type as Role,
    localId: active.local_id,
    assignmentId: active.id,
  };
}

export function requireRole(ctx: Ctx, ...allowed: Role[]) {
  if (!allowed.includes(ctx.role)) throw new ApiError(403, 'Not permitted for your role');
}

// The single point of scope control: national sees all, everyone else their local
export function scopeQuery<T extends { eq: (c: string, v: unknown) => T }>(ctx: Ctx, q: T): T {
  return ctx.role === 'national_president' ? q : q.eq('local_id', ctx.localId);
}

// Uniform error → response translation for every route
export function handleApiError(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}