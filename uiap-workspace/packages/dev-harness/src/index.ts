import express from 'express';
import cors from 'cors';
import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import type { 
  ModuleContext, 
  ModuleManifest, 
  UIAPModule,
  AuthenticatedUser,
  UIAPEvent,
  EventSubscriber
} from '@uiap/module-sdk';

async function bootstrap() {
  const cwd = process.cwd();
  console.log(`[Dev Harness] Starting in ${cwd}`);

  // 1. Load manifest
  const manifestPath = path.join(cwd, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`[Dev Harness] manifest.json not found in ${cwd}`);
    process.exit(1);
  }
  const manifest: ModuleManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  console.log(`[Dev Harness] Loaded manifest for ${manifest.id}@${manifest.version}`);

  // 2. Setup PGLite Database
  const dbPath = path.join(cwd, '.dev-db');
  console.log(`[Dev Harness] Initializing local database at ${dbPath}`);
  const db = new PGlite(dbPath);

  // 3. Run Migrations
  const migrationsDir = path.join(cwd, 'migrations');
  if (existsSync(migrationsDir)) {
    console.log(`[Dev Harness] Running migrations...`);
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      console.log(`[Dev Harness] Executing ${file}...`);
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      try {
        await db.exec(sql);
      } catch (err: any) {
        // Ignore if already exists, etc. A real migration runner is better but this works for simple dev
        console.warn(`[Dev Harness] Migration warning on ${file}: ${err.message}`);
      }
    }
  }

  // 4. Create Mock Context
  const subscribers: Record<string, EventSubscriber<any>[]> = {};
  
  const mockContext: ModuleContext = {
    module: { id: manifest.id, version: manifest.version, manifest },
    auth: {
      async getUserFromRequest() {
        return { id: 'dev-admin', username: 'Dev Admin', permissions: [] };
      }
    },
    rbac: {
      require() {
        return (req: any, res: any, next: any) => next();
      },
      async check() { return true; }
    },
    db: {
      schema: 'public',
      async query(text: string, params?: any[]) {
        return db.query(text, params);
      },
      async transaction(callback: any) {
        return db.transaction(callback);
      }
    },
    events: {
      publish: async (event: any) => {
        console.log(`[Dev Harness] Event Published: ${event.type}`, event.payload);
        const handlers = subscribers[event.type] || [];
        for (const handler of handlers) {
          handler({ ...event, source: manifest.id });
        }
        return { success: true, receivers: handlers.length, delivered: handlers.length, errors: [] };
      },
      subscribe: (type: string, handler: any) => {
        if (!subscribers[type]) subscribers[type] = [];
        subscribers[type].push(handler);
        return () => {
          subscribers[type] = subscribers[type].filter(h => h !== handler);
        };
      }
    },
    logger: {
      info: (...args) => console.log(`[${manifest.id}]`, ...args),
      warn: (...args) => console.warn(`[${manifest.id}]`, ...args),
      error: (...args) => console.error(`[${manifest.id}]`, ...args),
      debug: (...args) => console.debug(`[${manifest.id}]`, ...args),
    },
    config: {
      coreVersion: '0.1.0-dev',
      async get(key: string) { return undefined; }
    },
    organization: { id: 'dev-org', name: 'Dev Organization' },
    deployment: { type: 'local' },
    publish: async (event: any) => {
      console.log(`[Dev Harness] Event Published (Legacy): ${event.type}`, event.payload);
      return { success: true, receivers: 0, delivered: 0, errors: [] };
    },
    subscribe: (type: string, handler: any) => {
      return () => {};
    },
    registerApiRouter: () => {} // Overridden below
  };

  // 5. Express App
  const app = express();
  app.use(cors());
  app.use(express.json());

  mockContext.registerApiRouter = (router) => {
    app.use(`/api/m/${manifest.id}`, router);
    console.log(`[Dev Harness] Mounted module API at /api/m/${manifest.id}`);
  };

  // 6. Load Module
  const mainFile = (manifest as any).main || 'dist/index.js';
  const moduleIndexPath = path.join(cwd, mainFile);
  console.log(`[Dev Harness] Loading module from ${moduleIndexPath}`);
  
  // Use a dynamic import
  let moduleImport: any;
  try {
    moduleImport = await import('file://' + moduleIndexPath.replace(/\\/g, '/'));
  } catch (err: any) {
    console.error(`[Dev Harness] Failed to load module: ${err.message}`);
    process.exit(1);
  }

  let ModuleClass = moduleImport.default || moduleImport;
  if (ModuleClass.default) {
    ModuleClass = ModuleClass.default;
  }
  const instance: UIAPModule = new ModuleClass();
  
  console.log(`[Dev Harness] Activating module...`);
  await instance.activate(mockContext);

  const apiPort = process.env.API_PORT ? parseInt(process.env.API_PORT) : 4000;
  app.listen(apiPort, () => {
    console.log(`[Dev Harness] Backend listening on http://localhost:${apiPort}`);
  });

  // 7. Start Frontend
  const webSrcPath = path.join(cwd, 'web-src');
  if (existsSync(webSrcPath)) {
    console.log(`[Dev Harness] Starting Vite frontend...`);
    const vitePort = process.env.VITE_PORT || 3000;
    
    // We need to pass the API port to Vite so it knows where to proxy, but normally Vite config handles it.
    // For this project, Vite is configured to proxy to 3000, so we should actually listen on 3000, 
    // or tell the user to adjust the port. But wait, if Vite is on 3000, and backend is on 3000, they conflict.
    // Let's spawn Vite on its default or provided port.
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const viteProcess = spawn(npmCmd, ['run', 'dev', '--', '--port', vitePort.toString()], {
      cwd: webSrcPath,
      stdio: 'inherit',
      shell: true
    });

    viteProcess.on('error', (err) => {
      console.error(`[Dev Harness] Vite failed to start: ${err.message}`);
    });
  }
}

bootstrap().catch(console.error);
