import { getDb } from '../db/pool.js';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  is_active: boolean;
  requires_2fa: boolean;
  totp_secret: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Permission {
  module_name: string;
  action: string;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = getDb();
  const user = await db('core_users').where({ username }).first();
  return user || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const user = await db('core_users').where({ id }).first();
  return user || null;
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const db = getDb();
  const permissions = await db('core_permissions as p')
    .select('p.module_name', 'p.action')
    .join('core_role_permissions as rp', 'rp.permission_id', 'p.id')
    .join('core_user_roles as ur', 'ur.role_id', 'rp.role_id')
    .where('ur.user_id', userId);
  return permissions;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
