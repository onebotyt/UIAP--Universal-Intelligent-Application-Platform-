import knex, { Knex } from 'knex';
import { parseDatabaseConfig } from './config.js';
import * as path from 'path';

let dbInstance: Knex | null = null;

export function initDatabase(envOrConfig?: Record<string, string | undefined>): void {
  if (dbInstance) {
    dbInstance.destroy().catch(() => {});
    dbInstance = null;
  }

  const env = envOrConfig ?? process.env as Record<string, string | undefined>;
  const client = env.UIAP_DB_CLIENT ?? process.env.UIAP_DB_CLIENT ?? 'sqlite3';

  if (client === 'sqlite3') {
    dbInstance = knex({
      client: 'sqlite3',
      connection: {
        filename: env.UIAP_DB_FILE ?? process.env.UIAP_DB_FILE ?? path.join(process.cwd(), 'uiap_data.sqlite')
      },
      useNullAsDefault: true,
      pool: {
        afterCreate: (conn: any, cb: any) => {
          conn.run('PRAGMA foreign_keys = ON', cb);
        }
      }
    });
  } else {
    let dbUrl: string;
    try {
      const cfg = parseDatabaseConfig(env);
      dbUrl = cfg.DATABASE_URL;
    } catch {
      dbUrl = process.env.DATABASE_URL || '';
    }
    dbInstance = knex({
      client: client,
      connection: dbUrl,
      pool: { min: 2, max: 10 }
    });
  }

  console.log(`[DB] Initialized ${client} connection`);
}

/** Alias for initDatabase */
export function initDb(envOrConfig?: Record<string, string | undefined>): void {
  return initDatabase(envOrConfig);
}

export async function runMigrations(): Promise<void> {
  if (!dbInstance) initDatabase();
  
  const { coreMigrations } = await import('./knex-migrations.js');
  
  console.log('[DB] Running migrations...');
  
  const db = dbInstance!;
  
  const hasTable = await db.schema.hasTable('knex_migrations');
  if (!hasTable) {
    await db.schema.createTable('knex_migrations', table => {
      table.string('name').primary();
      table.timestamp('run_at').defaultTo(db.fn.now());
    });
  }

  const ran = await db('knex_migrations').select('name');
  const runSet = new Set(ran.map((m: any) => m.name));

  for (const migration of coreMigrations) {
    if (!runSet.has(migration.name)) {
      console.log(`[DB] Applying migration: ${migration.name}`);
      await migration.up(db);
      await db('knex_migrations').insert({ name: migration.name });
    }
  }
  
  console.log('[DB] Migrations complete');
}

export function getPool(): Knex {
  if (!dbInstance) {
    initDatabase();
  }
  return dbInstance!;
}

export function getDb(): Knex {
  return getPool();
}

/** Alias used by ModuleContextBuilder and modules */
export function getBuilder(): Knex {
  return getPool();
}

// Keep legacy query wrapper for backward compatibility
export async function query(text: string, params?: any[]): Promise<{ rows: any[], rowCount: number }> {
  if (!dbInstance) {
    initDatabase();
  }
  
  try {
    const result = await dbInstance!.raw(text, params || []);
    
    const clientType = dbInstance!.client.config.client;
    if (clientType === 'sqlite3') {
      return { rows: result, rowCount: result.length };
    } else if (clientType === 'mysql2') {
      return { rows: result[0], rowCount: result[0].length };
    } else {
      return { rows: result.rows, rowCount: result.rowCount };
    }
  } catch (error) {
    console.error('[DB] Query Error:', error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    console.log('[DB] Connection closed');
  }
}

export async function closeDb(): Promise<void> {
  return closePool();
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const db = getPool();
  return db.transaction(async (trx) => {
    return callback(trx);
  });
}

export function getActiveDatabaseUrl(): string {
  try {
    const cfg = parseDatabaseConfig(process.env as Record<string, string | undefined>);
    return cfg.DATABASE_URL;
  } catch {
    return process.env.DATABASE_URL || 'sqlite3://';
  }
}
