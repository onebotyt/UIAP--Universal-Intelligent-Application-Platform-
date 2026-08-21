import { fetch } from 'undici';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWriteStream, readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  CORE_VERSION,
  getPool,
  installModule,
  updateModule,
  disableModule,
  getModuleStatus,
} from '@uiap/core';
import { getConfig } from '../config.js';
import { SyncEngine } from '@uiap/sync';

export interface Entitlement {
  slug: string;
  display_name: string;
  status: string;
  expires_at: string | null;
  version: string | null;
}

export class CloudSyncService {
  private timer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    private readonly cloudUrl: string,
    private readonly installKey: string,
  ) {}

  start(intervalMs = 5 * 60 * 1000) {
    if (this.timer) return;
    this.timer = setInterval(() => this.sync(), intervalMs);
    console.log(`[CloudSync] Started polling every ${intervalMs}ms`);
    // Run an initial sync
    setTimeout(() => this.sync(), 2000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`[CloudSync] Stopped polling`);
    }
  }

  async sync() {
    if (this.isSyncing) return;
    if (!this.cloudUrl || !this.installKey) {
      console.log('[CloudSync] Missing cloud configuration, skipping sync');
      return;
    }

    this.isSyncing = true;
    try {
      console.log('[CloudSync] Fetching entitlements from cloud...');
      const response = await fetch(`${this.cloudUrl}/edge/v1/entitlements`, {
        headers: {
          Authorization: `Bearer ${this.installKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { status: string; entitlements: Entitlement[] };
      const entitlements = data.entitlements;

      await this.processEntitlements(entitlements);
      console.log(`[CloudSync] Sync complete. Processed ${entitlements.length} entitlements.`);
    } catch (error) {
      console.error('[CloudSync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processEntitlements(entitlements: Entitlement[]) {
    // We would cache these in the local DB for offline checks
    const pool = getPool();
    await pool.raw(
      'CREATE TABLE IF NOT EXISTS cloud_entitlements (slug TEXT PRIMARY KEY, version TEXT, status TEXT)',
    );

    // Process each entitlement
    for (const ent of entitlements) {
      // Upsert local cache
      await pool.raw(
        'INSERT INTO cloud_entitlements (slug, version, status) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET version = EXCLUDED.version, status = EXCLUDED.status',
        [ent.slug, ent.version, ent.status],
      );

      if (ent.status === 'active' && ent.version) {
        // Check if we need to install/update this module
        const isInstalled = !!(await getModuleStatus(ent.slug).catch(() => null));
        // Note: we should check if the installed version is older, but moduleManager doesn't expose version yet easily.
        // For phase 1, we just install if missing.
        if (!isInstalled) {
          console.log(`[CloudSync] Module ${ent.slug} is missing, downloading package...`);
          try {
            await this.downloadAndInstallModule(ent.slug, ent.version);
          } catch (err) {
            console.error(`[CloudSync] Failed to auto-install ${ent.slug}:`, err);
          }
        }
      } else if (ent.status === 'revoked' || ent.status === 'expired') {
        // Enforce license revocation locally by stopping the module
        const status = await getModuleStatus(ent.slug).catch(() => null);
        if (status) {
          console.log(`[CloudSync] License revoked/expired for ${ent.slug}. Stopping module.`);
          await disableModule(ent.slug, 'system');
        }
      }
    }
  }

  private async downloadAndInstallModule(slug: string, version: string) {
    const tempPath = join(tmpdir(), `module-${slug}-${version}.zip`);

    const response = await fetch(`${this.cloudUrl}/edge/v1/packages/${slug}/${version}`, {
      headers: {
        Authorization: `Bearer ${this.installKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    const packageHash = response.headers.get('X-Package-Hash');
    const signature = response.headers.get('X-Package-Signature');

    console.log(`[CloudSync] Saving package to ${tempPath}`);
    const fileStream = createWriteStream(tempPath);
    // @ts-ignore
    await pipeline(Readable.fromWeb(response.body), fileStream);

    console.log(`[CloudSync] Calling module manager to install ${slug}`);

    // In a real system, Core ModuleManager should handle signature verification using a built-in public key.
    // For now we just pass the ZIP.
    const zipBuffer = readFileSync(tempPath);
    try {
      await installModule(zipBuffer, 'system');
    } catch (err: any) {
      if (err.message.includes('already installed') || err.message.includes('Update version')) {
        await updateModule(zipBuffer, 'system');
      } else {
        throw err;
      }
    }
  }
}

let cloudSyncInstance: CloudSyncService | null = null;
let dataSyncEngine: SyncEngine | null = null;

export function startCloudSync() {
  if (cloudSyncInstance) return;

  const config = getConfig();
  if (config.cloudUrl && config.installKey) {
    cloudSyncInstance = new CloudSyncService(config.cloudUrl, config.installKey);
    cloudSyncInstance.start();

    // Determine WebSocket URL from Cloud URL (replace http/https with ws/wss)
    const wsUrl = config.cloudUrl.replace(/^http/, 'ws') + '/edge/v1/sync';

    // In a real app we'd fetch the installation's tenant ID from the cloud_entitlements or config.
    // We'll pass a mock tenantId for now.
    dataSyncEngine = new SyncEngine(getPool(), {
      wsUrl,
      installKey: config.installKey,
      tenantId: 'mock-tenant-id',
    });

    dataSyncEngine.start().catch((err) => {
      console.error('[CloudSync] Failed to start data SyncEngine:', err);
    });
  }
}
