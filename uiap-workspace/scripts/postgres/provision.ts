/**
 * scripts/postgres/provision.ts
 *
 * Main orchestrator for PostgreSQL provisioning on Windows.
 *
 * Flow:
 *   1. Detect existing PostgreSQL
 *   2. If absent → init cluster, register service, start
 *   3. Wait for readiness
 *   4. Create UIAP database & role
 *   5. Generate configuration (.env)
 *   6. Report results
 *
 * This script is designed to be called by the Inno Setup installer
 * after file extraction, using the bundled node.exe:
 *
 *   runtime\node.exe scripts\provision.js --uiap-root "C:\...\UIAP"
 *
 * All operations are idempotent. Running this script multiple times
 * will never destroy existing data.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { detectPostgres } from './detect.js';
import { initCluster, registerService, startService, waitForReady } from './service.js';
import { provisionDatabase } from './database.js';
import {
  PG_SERVICE_NAME,
  PG_DEFAULT_PORT,
  UIAP_DATABASE,
  UIAP_DB_USER,
} from './version.js';

/** Structured log entry for the provisioning process. */
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

const logs: LogEntry[] = [];

function log(level: LogEntry['level'], message: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  logs.push(entry);

  // Also print to stdout for Inno Setup progress visibility
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✓';
  console.log(`[UIAP Provision] ${prefix} ${message}`);
}

function writeLogs(logDir: string): void {
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'provision.log');
  const content = logs
    .map((e) => `[${e.timestamp}] [${e.level}] ${e.message}`)
    .join('\n');
  fs.appendFileSync(logPath, content + '\n');
}

/**
 * Parse CLI arguments.
 */
function parseArgs(): { uiapRoot: string } {
  const args = process.argv.slice(2);
  let uiapRoot = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--uiap-root' && args[i + 1]) {
      uiapRoot = args[i + 1];
      i++;
    }
  }

  if (!uiapRoot) {
    // Infer from script location: scripts is under UIAP root
    uiapRoot = path.resolve(path.dirname(process.argv[1]), '..');
  }

  return { uiapRoot };
}

async function main(): Promise<void> {
  const { uiapRoot } = parseArgs();

  const dataDir = path.join(uiapRoot, 'data');
  const configDir = path.join(dataDir, 'configuration');
  const logDir = path.join(dataDir, 'logs');
  const envPath = path.join(configDir, '.env');

  // UIAP-Database is deployed alongside the main UIAP folder
  const uiapDbBase = path.join(uiapRoot, '..', 'UIAP-Database');
  const pgDataDir = path.join(uiapDbBase, 'data');

  log('INFO', `UIAP root: ${uiapRoot}`);
  log('INFO', `Database base: ${uiapDbBase}`);

  try {
    // ─── Step 1: Detect existing PostgreSQL ───────────────────────
    log('INFO', 'Detecting PostgreSQL installation...');
    const detection = detectPostgres(uiapDbBase);

    if (detection.found) {
      log('INFO', `PostgreSQL found (version: ${detection.version || 'unknown'})`);
      log('INFO', `UIAP-managed: ${detection.uiapManaged}`);
      log('INFO', `Service running: ${detection.serviceRunning}`);

      if (!detection.versionSupported && detection.version) {
        log('ERROR', `PostgreSQL version ${detection.version} is not supported. UIAP requires PostgreSQL 14–17.`);
        writeLogs(logDir);
        process.exit(1);
      }
    } else {
      log('INFO', 'No existing PostgreSQL found. Will provision UIAP-managed instance.');
    }

    // ─── Step 2: Initialize cluster if needed ─────────────────────
    let superuserPassword = '';

    if (!detection.found || (detection.uiapManaged && !fs.existsSync(path.join(pgDataDir, 'PG_VERSION')))) {
      // Need to init a new cluster
      if (!detection.initdbPath) {
        // Check UIAP-bundled binaries
        const bundledInitdb = path.join(uiapDbBase, 'pgsql', 'bin', 'initdb.exe');
        if (!fs.existsSync(bundledInitdb)) {
          log('ERROR', 'PostgreSQL binaries not found. Installation may be incomplete.');
          writeLogs(logDir);
          process.exit(1);
        }
        detection.initdbPath = bundledInitdb;
        detection.pgCtlPath = path.join(uiapDbBase, 'pgsql', 'bin', 'pg_ctl.exe');
        detection.psqlPath = path.join(uiapDbBase, 'pgsql', 'bin', 'psql.exe');
      }

      log('INFO', 'Initializing PostgreSQL data cluster...');
      superuserPassword = initCluster(detection.initdbPath, pgDataDir);

      if (superuserPassword) {
        log('INFO', 'Cluster initialized successfully.');
        // Store superuser password securely for this session
        // (Written to a protected file that only the provision script reads)
        const pwPath = path.join(uiapDbBase, '.pg_superuser');
        fs.writeFileSync(pwPath, superuserPassword, { mode: 0o600 });
      } else {
        log('INFO', 'Cluster already initialized (idempotent).');
        // Try to read existing superuser password
        const pwPath = path.join(uiapDbBase, '.pg_superuser');
        if (fs.existsSync(pwPath)) {
          superuserPassword = fs.readFileSync(pwPath, 'utf-8').trim();
        }
      }
    } else if (detection.uiapManaged) {
      // Existing UIAP-managed instance — read stored password
      const pwPath = path.join(uiapDbBase, '.pg_superuser');
      if (fs.existsSync(pwPath)) {
        superuserPassword = fs.readFileSync(pwPath, 'utf-8').trim();
      }
    }

    // ─── Step 3: Register & start service ─────────────────────────
    if (!detection.found || detection.uiapManaged) {
      if (!detection.pgCtlPath) {
        detection.pgCtlPath = path.join(uiapDbBase, 'pgsql', 'bin', 'pg_ctl.exe');
      }
      if (!detection.psqlPath) {
        detection.psqlPath = path.join(uiapDbBase, 'pgsql', 'bin', 'psql.exe');
      }

      log('INFO', `Registering Windows service: ${PG_SERVICE_NAME}...`);
      registerService(detection.pgCtlPath, pgDataDir);
      log('INFO', 'Service registered.');

      log('INFO', 'Starting PostgreSQL service...');
      startService();
      log('INFO', 'Service start command issued.');
    } else if (!detection.serviceRunning) {
      // Existing non-UIAP PostgreSQL that's stopped
      log('INFO', 'Starting existing PostgreSQL service...');
      try {
        startService();
      } catch {
        log('WARN', 'Could not start the existing PostgreSQL service automatically. It may require manual intervention.');
      }
    }

    // ─── Step 4: Wait for readiness ───────────────────────────────
    log('INFO', 'Waiting for PostgreSQL to accept connections...');
    await waitForReady(PG_DEFAULT_PORT, 30000);
    log('INFO', 'PostgreSQL is ready and accepting connections.');

    // ─── Step 5: Create database & role ───────────────────────────
    if (!detection.psqlPath) {
      detection.psqlPath = path.join(uiapDbBase, 'pgsql', 'bin', 'psql.exe');
    }

    // For existing non-UIAP PostgreSQL, we need the superuser password
    // from the user or we need to try peer/trust auth
    if (!detection.uiapManaged && !superuserPassword && detection.found) {
      log('WARN', 'Existing PostgreSQL detected but no superuser password available.');
      log('WARN', 'Attempting to connect with trust/peer authentication...');
      superuserPassword = ''; // Will rely on pg_hba.conf trust setting
    }

    log('INFO', 'Provisioning UIAP database and role...');
    const dbResult = provisionDatabase(detection.psqlPath, superuserPassword, PG_DEFAULT_PORT);

    if (dbResult.roleCreated) {
      log('INFO', `Created database role: ${UIAP_DB_USER}`);
    } else {
      log('INFO', `Database role ${UIAP_DB_USER} already exists.`);
    }

    if (dbResult.databaseCreated) {
      log('INFO', `Created database: ${UIAP_DATABASE}`);
    } else {
      log('INFO', `Database ${UIAP_DATABASE} already exists.`);
    }

    // ─── Step 6: Generate configuration ───────────────────────────
    fs.mkdirSync(configDir, { recursive: true });

    if (fs.existsSync(envPath)) {
      log('INFO', 'Configuration file already exists. Preserving existing configuration.');
    } else {
      // Only write .env if we have a new password (new role was created)
      const dbPassword = dbResult.password || '';
      if (!dbPassword) {
        log('WARN', 'No database password available. Configuration may need manual editing.');
      }

      const jwtSecret = crypto.randomBytes(48).toString('base64url');
      const databaseUrl = `postgresql://${UIAP_DB_USER}:${dbPassword}@localhost:${PG_DEFAULT_PORT}/${UIAP_DATABASE}`;

      const envContent = [
        `DATABASE_URL=${databaseUrl}`,
        `JWT_SECRET=${jwtSecret}`,
        `UIAP_DATA_DIR=${dataDir}`,
        '',
      ].join('\n');

      fs.writeFileSync(envPath, envContent, { mode: 0o600 });
      log('INFO', 'Generated configuration file.');
    }

    // ─── Done ─────────────────────────────────────────────────────
    log('INFO', '✅ PostgreSQL provisioning complete.');
    writeLogs(logDir);
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log('ERROR', message);
    writeLogs(logDir);
    process.exit(1);
  }
}

main();
