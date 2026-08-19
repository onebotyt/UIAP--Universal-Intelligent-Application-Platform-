import { exec } from 'child_process';
import { promisify } from 'util';
import { getActiveDatabaseUrl } from './pool.js';
import { query, closePool, initDatabase } from './pool.js';
import { DatabaseBackup } from './backup.js';
import { runtime } from '../runtime/ModuleRuntime.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import AdmZip from 'adm-zip';

const execAsync = promisify(exec);

export interface BackupManifest {
  formatVersion: string;
  coreVersion: string;
  createdAt: string;
  modules: Array<{ id: string; version: string }>;
}

export interface BackupMetadata {
  id: string;
  sizeBytes: number;
  createdAt: string;
  manifest: BackupManifest;
}

export class BackupManager {
  private static get backupsDir() {
    return path.join(process.cwd(), 'modules_data', 'archives');
  }

  static async listBackups(): Promise<BackupMetadata[]> {
    const dir = this.backupsDir;
    try {
      await fs.mkdir(dir, { recursive: true });
      const files = await fs.readdir(dir);
      const archives = files.filter((f) => f.endsWith('.uiapbak'));

      const results: BackupMetadata[] = [];
      for (const file of archives) {
        try {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          const zip = new AdmZip(filePath);
          const manifestEntry = zip.getEntry('manifest.json');
          if (manifestEntry) {
            const manifestStr = manifestEntry.getData().toString('utf8');
            const manifest = JSON.parse(manifestStr) as BackupManifest;
            results.push({
              id: file.replace('.uiapbak', ''),
              sizeBytes: stat.size,
              createdAt: manifest.createdAt,
              manifest,
            });
          }
        } catch {
          // Skip corrupt archives in list
        }
      }
      return results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch {
      return [];
    }
  }

  static async getBackup(id: string): Promise<BackupMetadata | null> {
    const backups = await this.listBackups();
    return backups.find((b) => b.id === id) || null;
  }

  static async createBackup(): Promise<BackupMetadata> {
    const dir = this.backupsDir;
    await fs.mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `uiap-backup-${timestamp}`;
    const archivePath = path.join(dir, `${backupId}.uiapbak`);
    const tempDumpPath = path.join(dir, `${backupId}.temp.dump`);

    try {
      // 1. Get installed modules for manifest
      const modulesRes = await query('SELECT id, version FROM core.module_installations');
      const modules = modulesRes.rows.map((r: any) => ({ id: r.id, version: r.version }));

      const manifest: BackupManifest = {
        formatVersion: '1.0',
        coreVersion: '0.1.0',
        createdAt: new Date().toISOString(),
        modules,
      };

      const dbUrl = getActiveDatabaseUrl();
      await execAsync(`pg_dump "${dbUrl}" -F c -f "${tempDumpPath}"`);

      // 3. Compute SHA-256 checksum of the dump
      const dumpBuffer = await fs.readFile(tempDumpPath);
      const hash = createHash('sha256').update(dumpBuffer).digest('hex');

      // 4. Create the archive
      const zip = new AdmZip();
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
      zip.addFile('database.dump', dumpBuffer);
      zip.addFile('checksum.sha256', Buffer.from(hash, 'utf8'));
      zip.writeZip(archivePath);

      // Clean up temp dump
      await fs.unlink(tempDumpPath);

      const stat = await fs.stat(archivePath);
      return {
        id: backupId,
        sizeBytes: stat.size,
        createdAt: manifest.createdAt,
        manifest,
      };
    } catch (err: unknown) {
      // Cleanup on failure
      try {
        await fs.unlink(tempDumpPath);
      } catch {
        /* ignore */
      }
      try {
        await fs.unlink(archivePath);
      } catch {
        /* ignore */
      }
      throw new Error(`Failed to create backup: ${(err as Error).message}`);
    }
  }

  static async deleteBackup(id: string): Promise<void> {
    const dir = this.backupsDir;
    const archivePath = path.join(dir, `${id}.uiapbak`);
    try {
      await fs.unlink(archivePath);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }

  static async restoreBackup(id: string): Promise<void> {
    const dir = this.backupsDir;
    const archivePath = path.join(dir, `${id}.uiapbak`);

    // 1. Verify file exists
    try {
      await fs.access(archivePath);
    } catch {
      throw new Error(`Backup archive ${id} not found.`);
    }

    // 2. Extract and Validate Checksum
    const zip = new AdmZip(archivePath);
    const dumpEntry = zip.getEntry('database.dump');
    const checksumEntry = zip.getEntry('checksum.sha256');
    const manifestEntry = zip.getEntry('manifest.json');

    if (!dumpEntry || !checksumEntry || !manifestEntry) {
      throw new Error('Invalid backup archive structure');
    }

    const dumpBuffer = dumpEntry.getData();
    const expectedHash = checksumEntry.getData().toString('utf8').trim();
    const actualHash = createHash('sha256').update(dumpBuffer).digest('hex');

    if (expectedHash !== actualHash) {
      throw new Error('Backup integrity verification failed. Checksum mismatch!');
    }

    // 3. Create pre-restore safety checkpoint
    const safetyId = `pre_restore_${Date.now()}`;
    await DatabaseBackup.createCheckpoint('safety', safetyId);

    // 4. Stop modules to release DB locks
    await runtime.deactivateAll();

    // 5. Close DB Pool so pg_restore can cleanly drop and recreate
    await closePool();

    // Write the temp dump to disk so pg_restore can use it
    const tempDumpPath = path.join(dir, `temp_restore_${Date.now()}.dump`);
    await fs.writeFile(tempDumpPath, dumpBuffer);

    try {
      const dbUrl = getActiveDatabaseUrl();
      // -c means clean (drop database objects before recreating)
      // -1 means execute as a single transaction
      await execAsync(`pg_restore "${dbUrl}" -c -1 "${tempDumpPath}"`);
    } catch (err: unknown) {
      // Reinitialize pool
      initDatabase();
      try {
        await fs.unlink(tempDumpPath);
      } catch {
        /* ignore */
      }
      throw new Error(
        `Database restoration failed! Safety checkpoint preserved. Error: ${(err as Error).message}`,
      );
    }

    // Clean up
    try {
      await fs.unlink(tempDumpPath);
    } catch {
      /* ignore */
    }

    // 6. Reinitialize the PostgreSQL connection pool with the newly restored DB
    initDatabase();

    // 7. Re-initialize the ModuleRuntime with the newly restored database state
    try {
      await runtime.initialize();
    } catch (err: unknown) {
      console.error(`Runtime failed to initialize after restore: ${(err as Error).message}`);
    }
  }
}
