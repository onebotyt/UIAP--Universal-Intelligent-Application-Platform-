import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { app } from 'electron';

let pgProcess: ChildProcess | null = null;
const DATA_DIR = path.join(app.getPath('userData'), 'pgdata');
const PG_PORT = 5433; // We use a specific port so we don't conflict with system postgres

export async function startPostgres(): Promise<string> {
  console.log('[Postgres] Starting embedded PostgreSQL...');

  // In a real production build using embedded-postgres, we would unpack the binaries.
  // For this mock, we will just pretend we are managing PostgreSQL.
  // We'll return the DATABASE_URL so the API can connect to it.

  // Real implementation would look like:
  /*
  const embedded = require('embedded-postgres');
  if (!existsSync(DATA_DIR)) {
    await embedded.initdb({ dataDir: DATA_DIR });
  }
  pgProcess = spawn(embedded.getExecutable(), ['-D', DATA_DIR, '-p', PG_PORT.toString()]);
  // Wait for "database system is ready to accept connections" stdout
  */

  return `postgresql://postgres:postgres@localhost:${PG_PORT}/postgres`;
}

export async function stopPostgres(): Promise<void> {
  if (pgProcess) {
    console.log('[Postgres] Stopping embedded PostgreSQL...');
    pgProcess.kill('SIGINT');
    pgProcess = null;
  }
}
