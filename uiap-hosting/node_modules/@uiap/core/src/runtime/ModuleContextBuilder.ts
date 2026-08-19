/**
 * ModuleContextBuilder
 *
 * Factory that builds a full `ModuleContext` for a given module.
 * This is the bridge between Core internals and the SDK contract.
 *
 * Modules receive the built context — they never access Core directly.
 */

import type {
  ModuleContext,
  ModuleManifest,
  ModuleIdentityContext,
  ModuleAuthContext,
  ModuleRbacContext,
  ModuleDatabaseContext,
  ModuleEventsContext,
  ModuleLoggerContext,
  ModuleConfigContext,
  ModuleOrganizationContext,
  UIAPEvent,
  EventSubscriber,
  AuthenticatedUser,
} from '@uiap/module-sdk';
import { EventBus } from '../events/EventBus.js';
import { query, transaction, getPool, getDb } from '../db/pool.js';
import { getUserPermissions, getUserById } from '../auth/identity.js';
import { CORE_VERSION } from '../index.js';

/**
 * Derives a PostgreSQL schema name from a module ID.
 * Dots are replaced with underscores.
 *
 * Example: "uiap.platform-proof-demo" → "uiap_platform_proof_demo"
 */
export function moduleIdToSchema(moduleId: string): string {
  return moduleId.replace(/[.-]/g, '_');
}

export class ModuleContextBuilder {
  /**
   * Builds a complete ModuleContext for the given module.
   */
  static build(
    moduleId: string,
    version: string,
    manifest: ModuleManifest,
    eventBus: EventBus,
  ): ModuleContext {
    const schema = moduleIdToSchema(moduleId);

    // ── Module Identity ──
    const moduleCtx: ModuleIdentityContext = {
      id: moduleId,
      version,
      manifest,
    };

    // ── Auth ──
    const auth: ModuleAuthContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async getUserFromRequest(req: any): Promise<AuthenticatedUser | null> {
        const userId = req?.user?.id;
        if (!userId) return null;

        const user = await getUserById(userId);
        if (!user) return null;

        const permissions = await getUserPermissions(userId);
        return {
          id: user.id,
          username: user.username,
          permissions,
        };
      },
    };

    // ── RBAC ──
    const rbac: ModuleRbacContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      require(moduleName: string, action: string): any {
        // Returns an Express middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return async (req: any, res: any, next: any) => {
          const userId = req?.user?.id;
          if (!userId) {
            return res.status(401).json({
              error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
            });
          }

          const hasPermission = await rbac.check(userId, moduleName, action);
          if (!hasPermission) {
            return res.status(403).json({
              error: { message: 'Permission denied', code: 'FORBIDDEN' },
            });
          }

          next();
        };
      },

      async check(userId: string, moduleName: string, action: string): Promise<boolean> {
        const permissions = await getUserPermissions(userId);
        return permissions.some((p) => p.module_name === moduleName && p.action === action);
      },
    };

    // ── Database ──
    const db: ModuleDatabaseContext = {
      schema,

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async query(text: string, params?: unknown[]): Promise<any> {
        return transaction(async (tx) => {
          await tx.query(`SET search_path TO ${schema}, public`);
          const res = await tx.query(text, params);
          return res;
        });
      },

      getBuilder(): any {
        return getDb();
      },

      async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        return transaction(async (tx) => {
          await tx.query(`SET search_path TO ${schema}, public`);
          return callback(tx);
        });
      },
    };

    // ── Events ──
    const events: ModuleEventsContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publish: (event: Omit<UIAPEvent<any>, 'source'>) =>
        eventBus.publish({ ...event, source: moduleId } as UIAPEvent),
      subscribe: <T = unknown>(type: string, handler: EventSubscriber<T>) =>
        eventBus.subscribe(type, handler),
    };

    // ── Logger ──
    const prefix = `[${moduleId}]`;
    const logger: ModuleLoggerContext = {
      info: (message: string, ...args: unknown[]) => console.log(prefix, message, ...args),
      warn: (message: string, ...args: unknown[]) => console.warn(prefix, message, ...args),
      error: (message: string, ...args: unknown[]) => console.error(prefix, message, ...args),
      debug: (message: string, ...args: unknown[]) => console.debug(prefix, message, ...args),
    };

    // ── Config ──
    const config: ModuleConfigContext = {
      coreVersion: CORE_VERSION,

      async get(key: string): Promise<string | undefined> {
        try {
          const result = await query('SELECT value FROM core.configurations WHERE key = $1', [
            `${moduleId}.${key}`,
          ]);
          return result.rows[0]?.value;
        } catch {
          return undefined;
        }
      },
    };

    // ── Organization (v1 local stub) ──
    const organization: ModuleOrganizationContext = {
      id: 'local',
      name: 'Local Organization',
    };

    // ── Build full context ──
    const context: ModuleContext = {
      // Sub-contexts
      module: moduleCtx,
      auth,
      rbac,
      db,
      events,
      logger,
      config,
      organization,
      deployment: { type: 'local' },

      // Legacy top-level methods (backward compat)
      publish: events.publish,
      subscribe: events.subscribe,
      registerApiRouter: () => {}, // placeholder, overridden by ModuleRuntime
    };

    return context;
  }
}
