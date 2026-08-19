import { exec } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, unlinkSync } from 'fs';
import { join } from 'path';
import { getConfig } from '../config.js';
import * as os from 'os';

export class BackupService {
  private s3Client: S3Client | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  start(intervalMs = 24 * 60 * 60 * 1000) { // Daily
    if (this.timer) return;
    this.timer = setInterval(() => this.runBackup(), intervalMs);
    console.log(`[BackupService] Scheduled automated backups every ${intervalMs}ms`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runBackup(): Promise<void> {
    console.log('[BackupService] Starting database backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `uiap_backup_${timestamp}.sql`;
    const localFilePath = join(os.tmpdir(), fileName);

    return new Promise((resolve, reject) => {
      // Execute pg_dump
      // Assumes pg_dump is in the system PATH.
      const pgDumpCmd = `pg_dump ${getConfig().DATABASE_URL} -F p -f ${localFilePath}`;
      
      exec(pgDumpCmd, async (error, stdout, stderr) => {
        if (error) {
          console.error('[BackupService] pg_dump failed:', error);
          return reject(error);
        }

        console.log(`[BackupService] Backup created at ${localFilePath}`);

        if (this.s3Client && process.env.S3_BUCKET_NAME) {
          try {
            console.log('[BackupService] Uploading to S3...');
            const fileStream = createReadStream(localFilePath);
            
            await this.s3Client.send(new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `backups/${fileName}`,
              Body: fileStream,
            }));

            console.log('[BackupService] Upload complete.');
          } catch (uploadError) {
            console.error('[BackupService] S3 upload failed:', uploadError);
          } finally {
            // Clean up temporary local file
            try {
              unlinkSync(localFilePath);
            } catch (e) {}
          }
        } else {
          console.log('[BackupService] S3 not configured. Keeping local backup only.');
          // In a real app without S3, we would move the file to config.UIAP_BACKUP_DIR
        }

        resolve();
      });
    });
  }
}

export const backupService = new BackupService();
