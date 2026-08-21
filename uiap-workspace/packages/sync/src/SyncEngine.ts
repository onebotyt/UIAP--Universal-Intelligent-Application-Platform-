// import { Pool } from 'pg';
import { SyncQueue, SyncPayload } from './SyncQueue.js';
import { ModuleManifest } from '@uiap/module-sdk';

export interface SyncEngineConfig {
  wsUrl: string;
  installKey: string;
  tenantId: string;
}

export class SyncEngine {
  private queue: SyncQueue;
  private ws: any; // We will use a websocket client like 'ws' in actual implementation
  private connected = false;

  constructor(
    private pool: any,
    private config: SyncEngineConfig,
  ) {
    this.queue = new SyncQueue(pool);
  }

  async start() {
    await this.queue.initialize();
    this.connectWs();

    // Poll the queue every 5 seconds to flush pending changes if connected
    setInterval(() => {
      if (this.connected) {
        this.flushQueue();
      }
    }, 5000);
  }

  private connectWs() {
    console.log(`[SyncEngine] Connecting to ${this.config.wsUrl}...`);
    // Mock WebSocket connection
    this.connected = true;
    console.log(`[SyncEngine] Connected.`);

    // In a real implementation:
    // this.ws = new WebSocket(this.config.wsUrl, { headers: { 'x-tenant-id': this.config.tenantId, 'Authorization': `Bearer ${this.config.installKey}` } });
    // this.ws.on('open', () => { this.connected = true; this.flushQueue(); });
    // this.ws.on('message', (data) => this.handleIncomingSync(JSON.parse(data)));
    // this.ws.on('close', () => { this.connected = false; setTimeout(() => this.connectWs(), 5000); });
  }

  /**
   * Called by modules via triggers/events when local data changes.
   */
  async trackLocalChange(
    manifest: ModuleManifest,
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    data: any,
  ) {
    if (!manifest.sync || manifest.sync.strategy === 'local_only') {
      return; // Do not sync
    }

    if (!manifest.sync.tables.includes(table)) {
      return; // Table not marked for sync
    }

    console.log(`[SyncEngine] Tracking local change for ${manifest.id}.${table}`);
    await this.queue.push({
      moduleId: manifest.id,
      table,
      operation,
      recordId,
      data,
    });

    if (this.connected) {
      this.flushQueue();
    }
  }

  private async flushQueue() {
    const pending = await this.queue.getPending();
    if (pending.length === 0) return;

    console.log(`[SyncEngine] Flushing ${pending.length} changes to Cloud...`);

    for (const item of pending) {
      try {
        // Mock push to Cloud
        // this.ws.send(JSON.stringify({ type: 'SYNC_PUSH', payload: item }));

        // Mark as synced
        await this.queue.markSynced(item.id);
      } catch (err) {
        console.error(`[SyncEngine] Failed to sync item ${item.id}`, err);
      }
    }
  }

  /**
   * Handles incoming sync payloads from the Cloud
   */
  async handleIncomingSync(payload: SyncPayload, manifest: ModuleManifest) {
    if (!manifest.sync || manifest.sync.strategy === 'local_only') return;

    console.log(`[SyncEngine] Applying incoming sync for ${payload.moduleId}.${payload.table}`);

    const schema = payload.moduleId.replace(/[^a-zA-Z0-9_]/g, '_');

    if (payload.operation === 'INSERT') {
      // In a real app we'd construct a dynamic INSERT ON CONFLICT DO UPDATE
      // handling the 'latest_wins' conflict resolution by comparing 'updated_at'.
      console.log(`[SyncEngine] Applied INSERT to ${schema}.${payload.table}`);
    } else if (payload.operation === 'UPDATE') {
      console.log(`[SyncEngine] Applied UPDATE to ${schema}.${payload.table}`);
    } else if (payload.operation === 'DELETE') {
      console.log(`[SyncEngine] Applied DELETE to ${schema}.${payload.table}`);
    }
  }
}
