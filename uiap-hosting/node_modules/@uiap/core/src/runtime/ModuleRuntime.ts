import * as path from 'path';
import { getDb } from '../db/pool.js';
import { EventBus } from '../events/EventBus.js';
import { logAuthAction } from '../auth/audit.js';
import type { UIAPModule } from '@uiap/module-sdk';
import { EventDispatcher } from '../events/EventDispatcher.js';
import { EventRecovery } from '../events/EventRecovery.js';
import { ModuleContextBuilder } from './ModuleContextBuilder.js';

const MODULES_DIR = process.env.UIAP_MODULES_DIR || path.join(process.cwd(), 'modules_data');

export class ModuleRuntime {
  private activeModules: Map<string, UIAPModule> = new Map();
  private activeVersions: Map<string, string> = new Map();
  private cleanups: Map<string, () => void | Promise<void>> = new Map();
  public readonly eventBus = new EventBus();
  public readonly eventDispatcher = new EventDispatcher(this.eventBus);
  public readonly eventRecovery = new EventRecovery();

  // Exposes registered routers for the Edge API to mount dynamically.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly apiRouters: Map<string, any> = new Map();

  /**
   * Checks if a module is currently active in memory.
   */
  public isActive(moduleId: string): boolean {
    return this.activeModules.has(moduleId);
  }

  /**
   * Gets the active version of a module if it is currently active.
   */
  getActiveVersion(moduleId: string): string | undefined {
    return this.activeVersions.get(moduleId);
  }

  /**
   * Boots all currently enabled modules from the database.
   */
  async loadEnabledModules(): Promise<void> {
    const db = getDb();
    const modules = await db('core_module_installations').select('id').where({ is_enabled: true });
    for (const row of modules) {
      await this.activateModule(row.id);
    }
  }

  /**
   * Loads and activates a specific module.
   */
  async activateModule(moduleId: string, overrideVersion?: string): Promise<void> {
    if (this.activeModules.has(moduleId)) {
      return; // Already active
    }

    try {
      let activeVersion: string;
      if (overrideVersion) {
        activeVersion = overrideVersion;
      } else {
        // Get active version from DB
        const db = getDb();
        const moduleRow = await db('core_module_installations').select('version').where({ id: moduleId }).first();
        if (!moduleRow) {
          throw new Error(`Module ${moduleId} not found in database`);
        }
        activeVersion = moduleRow.version as string;
      }

      if (!activeVersion) {
        throw new Error(`Module ${moduleId} has no version installed`);
      }

      // 1. Resolve path to the module's server entry point (dist/index.js)
      const entryPath = path.join(
        MODULES_DIR,
        'installed',
        moduleId,
        activeVersion,
        'dist',
        'index.js',
      );

      // 2. Dynamically import the module
      // Use file:// protocol for Windows absolute paths compatibility in ES modules
      const fileUrl = 'file://' + entryPath.replace(/\\/g, '/');
      const moduleExports = await import(fileUrl);

      let ModuleClass = moduleExports.default;
      if (!ModuleClass) {
        // Fallback to finding a class that implements UIAPModule
        for (const key in moduleExports) {
          if (typeof moduleExports[key] === 'function' && moduleExports[key].prototype?.activate) {
            ModuleClass = moduleExports[key];
            break;
          }
        }
      }

      if (!ModuleClass) {
        throw new Error(`Module ${moduleId} does not export a valid UIAPModule`);
      }

      const instance = new ModuleClass() as UIAPModule;

      // 3. Create context using the SDK contract builder
      const moduleManifest = instance.manifest;
      const context = ModuleContextBuilder.build(
        moduleId,
        activeVersion,
        moduleManifest,
        this.eventBus,
      );

      // Override registerApiRouter to wire into runtime's router map
      (context as unknown as { registerApiRouter: (router: unknown) => void }).registerApiRouter = (
        router: unknown,
      ) => {
        this.apiRouters.set(moduleId, router);
      };

      // 4. Activate
      const cleanup = await instance.activate(context);

      this.activeModules.set(moduleId, instance);
      this.activeVersions.set(moduleId, activeVersion);
      if (typeof cleanup === 'function') {
        this.cleanups.set(moduleId, cleanup);
      }

      console.log(`[ModuleRuntime] Activated module: ${moduleId} (v${activeVersion})`);
    } catch (error: unknown) {
      console.error(`[ModuleRuntime] Failed to activate module ${moduleId}:`, error);

      // Isolate failure
      await logAuthAction('module.activation_failed', null, null, {
        module_id: moduleId,
        error: (error as Error).message,
      });

      // Update DB to disable the broken module
      const db = getDb();
      await db('core_module_installations').where({ id: moduleId }).update({ is_enabled: false });
    }
  }

  /**
   * Deactivates a module and unregisters its API.
   */
  async deactivateModule(moduleId: string): Promise<void> {
    const cleanup = this.cleanups.get(moduleId);
    if (cleanup) {
      try {
        await cleanup();
      } catch (error) {
        console.error(`[ModuleRuntime] Error during cleanup of module ${moduleId}:`, error);
      }
      this.cleanups.delete(moduleId);
    }

    this.activeModules.delete(moduleId);
    this.activeVersions.delete(moduleId);
    this.apiRouters.delete(moduleId);
    console.log(`[ModuleRuntime] Deactivated module: ${moduleId}`);
  }

  /**
   * Deactivates all modules.
   */
  async deactivateAll(): Promise<void> {
    this.eventDispatcher.stop();
    this.eventRecovery.stop();

    for (const moduleId of this.activeModules.keys()) {
      await this.deactivateModule(moduleId);
    }
  }

  /**
   * Initializes the runtime by loading all enabled modules.
   */
  async initialize(): Promise<void> {
    this.eventDispatcher.start();
    this.eventRecovery.start();
    await this.loadEnabledModules();
  }
}

// Singleton runtime instance
export const runtime = new ModuleRuntime();
