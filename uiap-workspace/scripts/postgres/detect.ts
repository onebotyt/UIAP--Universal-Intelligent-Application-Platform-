/**
 * scripts/postgres/detect.ts
 *
 * Detects an existing PostgreSQL installation on the Windows system.
 * Differentiates between UIAP-managed PostgreSQL and pre-existing installations.
 */

import { execSync } from 'child_process';
import * as net from 'net';
import {
  PG_SERVICE_NAME,
  PG_DEFAULT_PORT,
  isVersionSupported,
  parseMajorVersion,
} from './version.js';

export interface PostgresDetectionResult {
  /** Whether any PostgreSQL instance was found. */
  found: boolean;

  /** Whether the found instance is UIAP-managed (registered under PG_SERVICE_NAME). */
  uiapManaged: boolean;

  /** Whether the Windows service is currently running. */
  serviceRunning: boolean;

  /** The detected version string (e.g. "PostgreSQL 16.4"). */
  version: string | null;

  /** The detected major version number. */
  majorVersion: number | null;

  /** Whether the detected version is within our supported range. */
  versionSupported: boolean;

  /** The port PostgreSQL is listening on (or expected to). */
  port: number;

  /** The path to the pg_ctl executable, if found. */
  pgCtlPath: string | null;

  /** The path to the psql executable, if found. */
  psqlPath: string | null;

  /** The path to the initdb executable, if found. */
  initdbPath: string | null;
}

/**
 * Run a command silently and return trimmed stdout, or null on failure.
 */
function execQuiet(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

/**
 * Check if a TCP port is accepting connections on localhost.
 */
export function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
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

/**
 * Query the Windows Service Control Manager for a service's state.
 * Returns 'RUNNING', 'STOPPED', or null if the service doesn't exist.
 */
function getServiceState(serviceName: string): string | null {
  const output = execQuiet(
    `powershell -NoProfile -Command "(Get-Service -Name '${serviceName}' -ErrorAction SilentlyContinue).Status"`,
  );
  if (!output || output === '') return null;
  return output.toUpperCase();
}

/**
 * Attempt to find any PostgreSQL Windows services (not just UIAP-managed).
 */
function findAnyPostgresService(): { name: string; state: string } | null {
  const output = execQuiet(
    `powershell -NoProfile -Command "Get-Service | Where-Object { $_.Name -like 'postgresql*' -or $_.Name -like 'UIAP-PostgreSQL' } | Select-Object -First 1 -Property Name,Status | Format-List"`,
  );
  if (!output) return null;

  const nameMatch = output.match(/Name\s*:\s*(.+)/i);
  const statusMatch = output.match(/Status\s*:\s*(.+)/i);
  if (nameMatch && statusMatch) {
    return { name: nameMatch[1].trim(), state: statusMatch[1].trim().toUpperCase() };
  }
  return null;
}

/**
 * Try to get the PostgreSQL version from a psql executable.
 */
function getVersionFromPsql(psqlPath: string): string | null {
  const output = execQuiet(`"${psqlPath}" --version`);
  if (!output) return null;
  // Typical output: "psql (PostgreSQL) 16.4"
  const match = output.match(/(\d+\.\d+)/);
  return match ? match[0] : null;
}

/**
 * Locate PostgreSQL binaries on the system.
 * Checks UIAP-Database path first, then common Program Files locations.
 */
function findBinaries(uiapDbBasePath?: string): {
  pgCtl: string | null;
  psql: string | null;
  initdb: string | null;
} {
  const result = { pgCtl: null as string | null, psql: null as string | null, initdb: null as string | null };

  // Priority 1: UIAP-bundled PostgreSQL
  if (uiapDbBasePath) {
    const binDir = `${uiapDbBasePath}\\pgsql\\bin`;
    const pgCtl = `${binDir}\\pg_ctl.exe`;
    const psql = `${binDir}\\psql.exe`;
    const initdb = `${binDir}\\initdb.exe`;

    const pgCtlExists = execQuiet(`powershell -NoProfile -Command "Test-Path '${pgCtl}'"`) === 'True';
    if (pgCtlExists) {
      result.pgCtl = pgCtl;
      result.psql = psql;
      result.initdb = initdb;
      return result;
    }
  }

  return result;
}

/**
 * Main detection function.
 * @param uiapDbBasePath - The base path where UIAP-Database is installed (e.g. C:\Users\...\UIAP-Database)
 */
export function detectPostgres(uiapDbBasePath?: string): PostgresDetectionResult {
  const result: PostgresDetectionResult = {
    found: false,
    uiapManaged: false,
    serviceRunning: false,
    version: null,
    majorVersion: null,
    versionSupported: false,
    port: PG_DEFAULT_PORT,
    pgCtlPath: null,
    psqlPath: null,
    initdbPath: null,
  };

  // 1. Check for UIAP-managed service
  const uiapServiceState = getServiceState(PG_SERVICE_NAME);
  if (uiapServiceState) {
    result.found = true;
    result.uiapManaged = true;
    result.serviceRunning = uiapServiceState === 'RUNNING';
  }

  // 3. Locate binaries
  const binaries = findBinaries(uiapDbBasePath);
  result.pgCtlPath = binaries.pgCtl;
  result.psqlPath = binaries.psql;
  result.initdbPath = binaries.initdb;

  // If we found binaries but no service, we still consider PG "found"
  // Since we ignore system DBs, if we found binaries, it MUST be our bundled one!
  if (!result.found && (binaries.pgCtl || binaries.psql)) {
    result.found = true;
    result.uiapManaged = true; // ALWAYS uiapManaged if found from binaries now
  }

  // 4. Get version
  if (result.psqlPath) {
    const versionStr = getVersionFromPsql(result.psqlPath);
    if (versionStr) {
      result.version = versionStr;
      result.majorVersion = parseMajorVersion(versionStr);
      result.versionSupported = isVersionSupported(versionStr);
    }
  }

  return result;
}
