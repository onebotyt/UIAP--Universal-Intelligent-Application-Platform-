/**
 * UIAP Edge API — First-run setup routes
 *
 * Provides endpoints for initial administrator creation and setup status.
 * These endpoints are ONLY accessible when no users exist in the system.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, hashPassword } from '@uiap/core';

export const setupRouter = Router();

/**
 * Schema for creating the initial administrator account.
 */
const createAdminSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        'Username may only contain letters, numbers, underscores, dots, and hyphens',
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Check whether the system has been set up (i.e. at least one user exists).
 */
async function isSetupRequired(): Promise<boolean> {
  try {
    const result = await query('SELECT COUNT(*)::int AS count FROM core.users');
    return result.rows[0].count === 0;
  } catch {
    // If the table doesn't exist yet, setup is required
    return true;
  }
}

/**
 * GET /api/setup/status
 *
 * Returns the current setup status.
 * This endpoint is always accessible (no auth required).
 */
setupRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const needsSetup = await isSetupRequired();
    res.json({
      status: 'ok',
      setupRequired: needsSetup,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/setup/admin
 *
 * Create the initial administrator account.
 *
 * Security constraints:
 * - Only works when the users table is empty (first run).
 * - Once an admin is created, this endpoint returns 403.
 * - The password is hashed using the existing bcrypt-based auth system.
 */
setupRouter.post('/admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Guard: only allow if no users exist
    const needsSetup = await isSetupRequired();
    if (!needsSetup) {
      res.status(403).json({
        error: {
          message: 'Setup has already been completed. This endpoint is disabled.',
          code: 'SETUP_COMPLETE',
          requestId: req.id,
        },
      });
      return;
    }

    // Validate input
    const parseResult = createAdminSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          message: 'Invalid input',
          code: 'BAD_REQUEST',
          details: parseResult.error.issues,
          requestId: req.id,
        },
      });
      return;
    }

    const { username, password } = parseResult.data;

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the admin user
    const userResult = await query(
      'INSERT INTO core.users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash],
    );
    const userId = userResult.rows[0].id;

    // Create Administrator role (or reuse if it exists from a previous partial setup)
    let roleId: string;
    const roleCheck = await query("SELECT id FROM core.roles WHERE name = 'Administrator'");
    if (roleCheck.rows.length > 0) {
      roleId = roleCheck.rows[0].id;
    } else {
      const roleResult = await query(
        'INSERT INTO core.roles (name, description, is_system) VALUES ($1, $2, $3) RETURNING id',
        ['Administrator', 'Superuser with full access', true],
      );
      roleId = roleResult.rows[0].id;
    }

    // Assign role to user
    await query(
      'INSERT INTO core.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleId],
    );

    // Assign all core management permissions
    const permsResult = await query(`
      SELECT id FROM core.permissions
      WHERE module_name IN ('core.users', 'core.roles', 'core.modules')
      AND action IN ('view', 'manage')
    `);

    for (const row of permsResult.rows) {
      await query(
        'INSERT INTO core.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roleId, row.id],
      );
    }

    res.status(201).json({
      status: 'ok',
      message: 'Administrator account created successfully.',
      user: { id: userId, username },
    });
  } catch (error) {
    next(error);
  }
});
