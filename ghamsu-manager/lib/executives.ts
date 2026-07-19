import { randomBytes } from 'crypto';
import { ApiError, type Ctx } from './rbac';

// Shown once to the creating admin, who shares it out-of-band (phone/WhatsApp) —
// same trust model as the self-registration link. There's no self-service
// password change yet; that's a natural follow-up if this needs to be more
// than a one-time credential.
export function generateTempPassword(): string {
  const random = randomBytes(9).toString('base64').replace(/[+/=]/g, '');
  return `${random}Aa1!`;
}

// Shared by the activate/deactivate routes: national can manage anyone but
// themselves; a local president is limited to their own local's treasurer/secretary.
export function assertCanManageAssignment(
  ctx: Ctx,
  assignment: { user_id: string; role_type: string; local_id: number | null },
) {
  if (ctx.role === 'local_president') {
    if (assignment.local_id !== ctx.localId) throw new ApiError(403, 'Not permitted for this executive');
    if (assignment.role_type !== 'treasurer' && assignment.role_type !== 'secretary') {
      throw new ApiError(403, 'Local presidents can only manage treasurer or secretary accounts');
    }
  }
  if (assignment.user_id === ctx.userId) throw new ApiError(403, 'You cannot manage your own account');
}
