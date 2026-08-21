import { getDb } from '../db/pool.js';

export interface AuditLogOptions {
  userId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  details?: Record<string, any>;
}

export class AuditLogger {
  /**
   * Records an immutable audit log entry.
   * Fails silently in case of DB error so it doesn't crash the main transaction,
   * but logs the error to standard error. In a true highly-available production system,
   * this might also write to a local log file as a fallback.
   */
  static async log(options: AuditLogOptions): Promise<void> {
    try {
      const db = getDb();
      await db('core_audit_logs').insert({
        user_id: options.userId || null,
        action: options.action,
        resource: options.resource || null,
        ip_address: options.ipAddress || null,
        details: options.details ? JSON.stringify(options.details) : null,
      });
    } catch (err) {
      console.error('[AuditLogger] Failed to write audit log:', err);
    }
  }
}
