/**
 * scripts/postgres/service.ts
 *
 * Manages the PostgreSQL Windows service lifecycle:
 * - initdb (cluster initialization)
 * - Service registration (pg_ctl register)
 * - Service start/stop
 * - Readiness retry loop (bounded connection test)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as net from 'net';
import { PG_SERVICE_NAME, PG_SUPERUSER, PG_DEFAULT_PORT } from './version.js';

/**
 * Run a command, returning stdout. Throws with a human-readable message on failure.
 */
function exec(cmd: string, errorContext: string): string {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 })
      .toString()
      .trim();
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() || '';
    throw new Error(`${errorContext}\nCommand: ${cmd}\n${stderr}`);
  }
}

/**
 * Initialize a new PostgreSQL data cluster using initdb.
 *
 * @param initdbPath  - Path to initdb.exe
 * @param dataDir     - Path for the new PostgreSQL data directory
 * @returns The generated superuser password
 */
export function initCluster(initdbPath: string, dataDir: string): string {
  if (fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    // Cluster already initialized — idempotent
    return '';
  }

  fs.mkdirSync(dataDir, { recursive: true });

  // Generate a strong random password for the postgres superuser
  const superuserPassword = crypto.randomBytes(24).toString('base64url');

  // Write temporary password file for initdb
  const pwFile = path.join(dataDir, '..', '.pg_superuser_pw');
  fs.writeFileSync(pwFile, superuserPassword, { mode: 0o600 });

  try {
    exec(
      `"${initdbPath}" -D "${dataDir}" -U ${PG_SUPERUSER} -A md5 --pwfile="${pwFile}" -E UTF8 --locale=C`,
      'PostgreSQL cluster initialization failed.',
    );
  } finally {
    // Remove the password file immediately
    try {
      fs.unlinkSync(pwFile);
    } catch {
      // best effort
    }
  }

  return superuserPassword;
}

/**
 * Register PostgreSQL as a Windows service using pg_ctl.
 *
 * @param pgCtlPath - Path to pg_ctl.exe
 * @param dataDir   - Path to the PostgreSQL data directory
 */
export function registerService(pgCtlPath: string, dataDir: string): void {
  // Check if the service already exists
  try {
    const output = execSync(
      `powershell -NoProfile -Command "(Get-Service -Name '${PG_SERVICE_NAME}' -ErrorAction SilentlyContinue).Name"`,
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
      .toString()
      .trim();
    if (output === PG_SERVICE_NAME) {
      // Service already registered — idempotent
      return;
    }
  } catch {
    // Service doesn't exist, proceed to register
  }

  exec(
    `"${pgCtlPath}" register -N "${PG_SERVICE_NAME}" -D "${dataDir}" -S auto`,
    'PostgreSQL service registration failed.',
  );
}

/**
 * Start the UIAP-PostgreSQL Windows service.
 */
export function startService(): void {
  const state = getServiceState();
  if (state === 'RUNNING') return; // Already running

  exec(
    `powershell -NoProfile -Command "Start-Service -Name '${PG_SERVICE_NAME}'"`,
    'PostgreSQL service could not be started.',
  );
}

/**
 * Stop the UIAP-PostgreSQL Windows service.
 */
export function stopService(): void {
  const state = getServiceState();
  if (state !== 'RUNNING') return;

  exec(
    `powershell -NoProfile -Command "Stop-Service -Name '${PG_SERVICE_NAME}' -Force"`,
    'PostgreSQL service could not be stopped.',
  );
}

/**
 * Get the current state of the UIAP-PostgreSQL service.
 */
function getServiceState(): string | null {
  try {
    return execSync(
      `powershell -NoProfile -Command "(Get-Service -Name '${PG_SERVICE_NAME}' -ErrorAction SilentlyContinue).Status"`,
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
      .toString()
      .trim()
      .toUpperCase();
  } catch {
    return null;
  }
}

/**
 * Wait until PostgreSQL is accepting connections on the specified port.
 * Uses a bounded retry loop with exponential backoff.
 *
 * @param port      - The port to test
 * @param maxWaitMs - Maximum total wait time in milliseconds (default: 30s)
 * @throws Error if PostgreSQL doesn't become ready within the timeout
 */
export async function waitForReady(port: number = PG_DEFAULT_PORT, maxWaitMs: number = 30000): Promise<void> {
  const startTime = Date.now();
  let delay = 500;

  while (Date.now() - startTime < maxWaitMs) {
    const isOpen = await testPort(port);
    if (isOpen) return;

    await sleep(delay);
    delay = Math.min(delay * 1.5, 3000); // Cap at 3s
  }

  throw new Error(
    `PostgreSQL started but is not accepting connections on port ${port} after ${Math.round(maxWaitMs / 1000)}s.`,
  );
}

/**
 * Test if a TCP port is accepting connections.
 */
function testPort(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
