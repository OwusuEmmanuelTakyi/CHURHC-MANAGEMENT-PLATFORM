import { ApiError, type Ctx } from './rbac';

// national_president only ever manages national-scoped positions; local_president
// manages both local- and wing-scoped positions, but only within their own local.
export function assertOwnsPosition(ctx: Ctx, position: { scope: string; local_id: number | null }) {
  if (ctx.role === 'national_president') {
    if (position.scope !== 'national') throw new ApiError(403, 'Not permitted for this position');
  } else if (ctx.role === 'local_president') {
    if (position.local_id !== ctx.localId) throw new ApiError(403, 'Not permitted for this position');
  } else {
    throw new ApiError(403, 'Not permitted');
  }
}
