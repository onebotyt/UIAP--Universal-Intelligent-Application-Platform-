import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  id: string; // The organization ID (e.g., 'org_abc')
  databaseUrl: string; // The connection string to their specific database
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Executes a callback within a specific tenant context.
 * Useful for middleware to wrap the entire request.
 */
export function runWithTenant<T>(tenant: TenantContext, callback: () => T): T {
  return tenantContextStorage.run(tenant, callback);
}

/**
 * Retrieves the current tenant context.
 * Returns null if running in single-tenant (Local Edge) mode.
 */
export function getTenantContext(): TenantContext | null {
  return tenantContextStorage.getStore() ?? null;
}
