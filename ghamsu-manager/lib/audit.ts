import { db } from '@/lib/supabase/server';
import type { Ctx } from '@/lib/rbac';

export async function audit(
  ctx: Ctx, action: string, entityType: string,
  entityId: string | number, metadata?: Record<string, unknown>,
) {
  await db.from('audit_logs').insert({
    user_id: ctx.userId, action, entity_type: entityType,
    entity_id: String(entityId), local_id: ctx.localId, metadata: metadata ?? null,
  });
}