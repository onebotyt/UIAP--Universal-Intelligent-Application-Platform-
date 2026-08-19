import { getDb } from '../db/pool.js';
import type { Permission } from './identity.js';

export interface PermissionRecord extends Permission {
  id: string;
  description: string;
}

export async function getPermissions(): Promise<PermissionRecord[]> {
  const db = getDb();
  return await db('core_permissions')
    .select('id', 'module_name', 'action', 'description')
    .orderBy(['module_name', 'action']);
}
