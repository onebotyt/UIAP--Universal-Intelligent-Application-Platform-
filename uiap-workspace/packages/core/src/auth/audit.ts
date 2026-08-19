import { getDb } from '../db/pool.js';

export async function logAuthAction(
  action: string,
  actorId?: string | null,
  ipAddress?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  await db('core_audit_logs').insert({
    id: crypto.randomUUID(),
    action,
    actor_id: actorId || null,
    ip_address: ipAddress || null,
    details: details ? JSON.stringify(details) : null
  });
}
