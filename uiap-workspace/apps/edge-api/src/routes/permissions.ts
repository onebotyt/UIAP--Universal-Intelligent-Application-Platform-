import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getPermissions } from '@uiap/core';

export const permissionsRouter = Router();

permissionsRouter.use(requireAuth);

// GET /api/permissions - List permissions
permissionsRouter.get('/', requirePermission('core.roles', 'view'), async (req, res, next) => {
  try {
    const permissions = await getPermissions();
    res.json({ status: 'ok', data: permissions });
  } catch (error) {
    next(error);
  }
});
