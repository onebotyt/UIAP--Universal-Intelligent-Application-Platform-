import { getDb } from '../db/pool.js';
import { logAuthAction } from './audit.js';
import { hashPassword } from './identity.js';
import type { User } from './identity.js';

export interface UserRecord extends Omit<User, 'password_hash'> {
  roles?: string[]; // Array of role IDs
}

export async function getUsers(): Promise<UserRecord[]> {
  const db = getDb();

  const usersData = await db('core_users as u')
    .leftJoin('core_user_roles as ur', 'u.id', 'ur.user_id')
    .select('u.id', 'u.username', 'u.is_active', 'u.requires_2fa', 'u.totp_secret', 'ur.role_id')
    .orderBy('u.username');

  const userMap = new Map<string, UserRecord>();

  for (const row of usersData) {
    if (!userMap.has(row.id)) {
      userMap.set(row.id, {
        id: row.id,
        username: row.username,
        is_active: row.is_active,
        requires_2fa: row.requires_2fa,
        totp_secret: row.totp_secret,
        roles: []
      });
    }
    if (row.role_id) {
      userMap.get(row.id)!.roles!.push(row.role_id);
    }
  }

  return Array.from(userMap.values());
}

export async function createUser(
  username: string,
  passwordPlain: string,
  actorId: string,
): Promise<UserRecord> {
  const passwordHash = await hashPassword(passwordPlain);
  const db = getDb();
  const id = crypto.randomUUID();

  await db('core_users').insert({
    id,
    username,
    password_hash: passwordHash,
    is_active: true,
    requires_2fa: false,
    totp_secret: null
  });

  const user = await db('core_users').where({ id }).first();
  await logAuthAction('user.created', actorId, null, { user_id: id, username });
  
  return { ...user, roles: [] };
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean,
  actorId: string,
): Promise<UserRecord> {
  const db = getDb();
  
  const updatedCount = await db('core_users')
    .where({ id: userId })
    .update({ is_active: isActive });

  if (updatedCount === 0) {
    throw new Error('User not found');
  }

  const user = await db('core_users').where({ id: userId }).first();

  await logAuthAction('user.status_changed', actorId, null, {
    user_id: userId,
    is_active: isActive,
  });
  return user;
}

export async function assignUserRoles(
  userId: string,
  roleIds: string[],
  actorId: string,
): Promise<void> {
  const db = getDb();

  await db.transaction(async (trx) => {
    await trx('core_user_roles').where({ user_id: userId }).delete();

    if (roleIds.length > 0) {
      const inserts = roleIds.map(roleId => ({
        id: crypto.randomUUID(),
        user_id: userId,
        role_id: roleId
      }));
      await trx('core_user_roles').insert(inserts);
    }
  });

  await logAuthAction('user.roles_changed', actorId, null, { user_id: userId, roles: roleIds });
}
