import { z } from 'zod';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const dataDir = process.env.UIAP_DATA_DIR || process.cwd();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for production security'),
  UIAP_DATA_DIR: z.string().default(dataDir),
  UIAP_MODULES_DIR: z
    .string()
    .default(path.join(dataDir, process.env.UIAP_DATA_DIR ? 'modules' : 'modules_data')),
  UIAP_BACKUP_DIR: z
    .string()
    .default(path.join(dataDir, process.env.UIAP_DATA_DIR ? 'backups' : 'backups_data')),
  UIAP_TRUSTED_KEYS_DIR: z.string().default(path.join(process.cwd(), 'trusted_keys')), // Typically in app dir, not data dir
  UIAP_CLOUD_URL: z.string().url().optional(),
  UIAP_INSTALL_KEY: z.string().optional(),
});

export type Config = z.infer<typeof envSchema> & {
  cloudUrl?: string;
  installKey?: string;
};

export class ConfigurationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super('Configuration validation failed');
    this.name = 'ConfigurationError';
  }
}

let activeConfig: Config | null = null;

export function parseConfig(env: NodeJS.ProcessEnv): Config {
  // Load from UIAP_DATA_DIR/configuration/.env if in production
  if (env.NODE_ENV === 'production' && env.UIAP_DATA_DIR) {
    const envPath = path.join(env.UIAP_DATA_DIR, 'configuration', '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      env = process.env;
    }
  } else if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
    dotenv.config();
    env = process.env;
  }

  const result = envSchema.safeParse(env);

  if (!result.success) {
    throw new ConfigurationError(result.error.issues);
  }

  activeConfig = {
    ...result.data,
    cloudUrl: result.data.UIAP_CLOUD_URL,
    installKey: result.data.UIAP_INSTALL_KEY
  };
  return activeConfig;
}

export function getConfig(): Config {
  if (!activeConfig) {
    throw new Error('Config not initialized. Call parseConfig first.');
  }
  return activeConfig;
}

export function isProduction(): boolean {
  if (!activeConfig) return false;
  return activeConfig.NODE_ENV === 'production';
}
