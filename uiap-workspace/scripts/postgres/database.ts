/**
 * scripts/postgres/database.ts
 *
 * Creates the UIAP database and restricted role on a running PostgreSQL instance.
 * All operations are idempotent — safe to run multiple times.
 */

import { execSync } from 'child_process';
import * as crypto from 'crypto';
import { UIAP_DATABASE, UIAP_DB_USER, PG_SUPERUSER, PG_DEFAULT_PORT } from './version.js';

/**
 * Result of database provisioning.
 */
export interface DatabaseProvisionResult {
  /** The database name that was created or already existed. */
  database: string;

  /** The role name that was created or already existed. */
  role: string;

  /** The generated password for the UIAP role (empty string if role already existed). */
  password: string;

  /** Whether the database was newly created (vs already existed). */
  databaseCreated: boolean;

  /** Whether the role was newly created (vs already existed). */
  roleCreated: boolean;
}

/**
 * Execute a SQL statement via psql. The superuser password is passed via PGPASSWORD env var.
 */
function psqlExec(
  psqlPath: string,
  sql: string,
  superuserPassword: string,
  port: number = PG_DEFAULT_PORT,
): string {
  try {
    return execSync(
      `"${psqlPath}" -h 127.0.0.1 -p ${port} -U ${PG_SUPERUSER} -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000,
        env: { ...process.env, PGPASSWORD: superuserPassword },
      },
    )
      .toString()
      .trim();
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() || '';
    throw new Error(`SQL execution failed.\nSQL: ${sql}\n${stderr}`);
  }
}

/**
 * Generate a cryptographically strong random password.
 */
export function generatePassword(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Provision the UIAP database and restricted role.
 *
 * This function is fully idempotent:
 * - If the role already exists, it is not recreated.
 * - If the database already exists, it is not recreated.
 * - Credentials are only generated for new roles.
 *
 * @param psqlPath          - Path to psql.exe
 * @param superuserPassword - The postgres superuser password
 * @param port              - PostgreSQL port (default: 5432)
 * @returns DatabaseProvisionResult
 */
export function provisionDatabase(
  psqlPath: string,
  superuserPassword: string,
  port: number = PG_DEFAULT_PORT,
): DatabaseProvisionResult {
  const result: DatabaseProvisionResult = {
    database: UIAP_DATABASE,
    role: UIAP_DB_USER,
    password: '',
    databaseCreated: false,
    roleCreated: false,
  };

  // 1. Check if role exists
  const roleExists = psqlExec(
    psqlPath,
    `SELECT 1 FROM pg_roles WHERE rolname = '${UIAP_DB_USER}'`,
    superuserPassword,
    port,
  );

  if (roleExists !== '1') {
    // Create the restricted role with a generated password
    result.password = generatePassword();
    psqlExec(
      psqlPath,
      `CREATE ROLE ${UIAP_DB_USER} WITH LOGIN PASSWORD '${result.password}'`,
      superuserPassword,
      port,
    );
    result.roleCreated = true;
  }

  // 2. Check if database exists
  const dbExists = psqlExec(
    psqlPath,
    `SELECT 1 FROM pg_database WHERE datname = '${UIAP_DATABASE}'`,
    superuserPassword,
    port,
  );

  if (dbExists !== '1') {
    // Create the database owned by the UIAP role
    psqlExec(
      psqlPath,
      `CREATE DATABASE ${UIAP_DATABASE} OWNER ${UIAP_DB_USER}`,
      superuserPassword,
      port,
    );
    result.databaseCreated = true;
  }

  // 3. Grant connection privileges (idempotent)
  psqlExec(
    psqlPath,
    `GRANT ALL PRIVILEGES ON DATABASE ${UIAP_DATABASE} TO ${UIAP_DB_USER}`,
    superuserPassword,
    port,
  );

  // 4. Grant schema usage on public schema within the UIAP database
  try {
    execSync(
      `"${psqlPath}" -h 127.0.0.1 -p ${port} -U ${PG_SUPERUSER} -d ${UIAP_DATABASE} -t -A -c "GRANT ALL ON SCHEMA public TO ${UIAP_DB_USER}"`,
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000,
        env: { ...process.env, PGPASSWORD: superuserPassword },
      },
    );
  } catch {
    // Non-fatal: schema grant may fail on older PG versions where public is already granted
  }

  return result;
}
