/**
 * UIAP Edge API — Server entry point
 *
 * Imports the app factory and starts the HTTP listener.
 * This file is the entry point for `npm run dev` and `npm start`.
 */

import { createApp } from './app.js';
import { parseConfig, ConfigurationError } from './config.js';
import { runtime, initDatabase, closePool, getDb, runMigrations } from '@uiap/core';
import { fileURLToPath } from 'url';
import * as path from 'path';

async function waitForDatabase(maxRetries = 30, intervalMs = 2000): Promise<void> {
  console.log('[UIAP Edge API] Waiting for database to become ready...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      await getDb().raw('SELECT 1');
      console.log('[UIAP Edge API] Database connection established.');
      return;
    } catch (error: unknown) {
      if (
        (error as NodeJS.ErrnoException).code === 'ECONNREFUSED' ||
        (error as Error).message?.includes('database') ||
        (error as Error).message?.includes('role') ||
        (error as Error).message?.includes('password') ||
        (error as Error).message?.includes('authentication')
      ) {
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('PostgreSQL database failed to become ready within the timeout period.');
}

// Track bootstrap state for readiness probes
export let isReady = false;
let server: import('http').Server | undefined;

async function bootstrap() {
  try {
    // 1. Config
    const config = parseConfig(process.env);

    // 2. Database connection
    console.log('[UIAP Edge API] Initializing database connection...');
    initDatabase(process.env);

    // Wait for the database connection (bounded retry to survive slow OS service starts)
    await waitForDatabase();

    // 3. Migrations
    console.log('[UIAP Edge API] Running database migrations...');
    await runMigrations();

    // 4 & 5. Runtime initialization (starts recovery, dispatcher, and loads modules)
    console.log('[UIAP Edge API] Initializing Core Runtime...');
    await runtime.initialize();

    // 6. Start server
    const app = createApp({ isReady: () => isReady });
    const PORT = config.PORT;
    server = app.listen(PORT, () => {
      console.log(`[UIAP Edge API] listening on http://localhost:${PORT}`);
      isReady = true;

      // 7. Start background services
      import('./services/cloud-sync.js')
        .then(({ startCloudSync }) => {
          startCloudSync();
        })
        .catch((err) => {
          console.error('[UIAP Edge API] Failed to start cloud sync service:', err);
        });

      import('./services/backup.js')
        .then(({ backupService }) => {
          backupService.start();
        })
        .catch((err) => {
          console.error('[UIAP Edge API] Failed to start backup service:', err);
        });
    });
  } catch (error: unknown) {
    if (error instanceof ConfigurationError) {
      console.error('[UIAP Edge API] Configuration validation failed:', error.issues);
    } else {
      console.error('[UIAP Edge API] Fatal error during bootstrap:', error);
    }
    process.exit(1);
  }
}

// 7. Graceful Shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[UIAP Edge API] Received ${signal}. Shutting down gracefully...`);
  isReady = false;

  const promises: Promise<void>[] = [];

  if (server) {
    promises.push(new Promise((resolve) => server?.close(() => resolve())));
  }

  // Deactivate all modules safely (also stops dispatcher and recovery)
  try {
    await runtime.deactivateAll();
  } catch (e: unknown) {
    console.error('[UIAP Edge API] Error deactivating runtime:', e);
  }

  // Close db pool
  promises.push(closePool());

  try {
    await Promise.all(promises);
    console.log('[UIAP Edge API] Shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('[UIAP Edge API] Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the sequence
bootstrap();
