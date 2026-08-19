// import { Pool } from 'pg';

export interface SyncPayload {
  id: string;
  moduleId: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  data: any;
  timestamp: Date;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export class SyncQueue {
  constructor(private pool: any) {}

  /**
   * Initializes the core_sync_queue table.
   * In a real app this would be a core migration, but since this is a new module
   * we can initialize it here for the demo.
   */
  async initialize() {
    await this.pool.raw(`
      CREATE TABLE IF NOT EXISTS core_sync_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        record_id VARCHAR(255) NOT NULL,
        data JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'PENDING'
      );
    `);
  }

  async push(payload: Omit<SyncPayload, 'id' | 'status' | 'timestamp'>) {
    const res = await this.pool.raw(
      `INSERT INTO core_sync_queue (module_id, table_name, operation, record_id, data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [payload.moduleId, payload.table, payload.operation, payload.recordId, payload.data]
    );
    return (res.rows ?? res)[0].id;
  }

  async getPending(limit: number = 100): Promise<SyncPayload[]> {
    const res = await this.pool.raw('SELECT * FROM core_sync_queue WHERE status = $1 ORDER BY timestamp ASC LIMIT $2', ['PENDING', limit]);
    return (res.rows ?? res).map((row: any) => ({
      id: row.id,
      moduleId: row.module_id,
      table: row.table_name,
      operation: row.operation,
      recordId: row.record_id,
      data: row.data,
      timestamp: row.timestamp,
      status: row.status
    }));
  }

  async markSynced(id: string) {
    await this.pool.raw('UPDATE core_sync_queue SET status = $1 WHERE id = $2', ['SYNCED', id]);
  }

  async markFailed(id: string) {
    await this.pool.raw('UPDATE core_sync_queue SET status = $1 WHERE id = $2', ['FAILED', id]);
  }
}
