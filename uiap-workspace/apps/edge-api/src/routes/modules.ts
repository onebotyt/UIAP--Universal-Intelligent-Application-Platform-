import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';
import {
  getModules,
  installModule,
  enableModule,
  disableModule,
  updateModule,
  rollbackModule,
  runtime,
} from '@uiap/core';

export const modulesRouter = Router();

// Memory storage for small to medium modules. Large modules would need disk storage and streams.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

modulesRouter.use(requireAuth);

// GET /api/modules - List installed modules
modulesRouter.get('/', requirePermission('core.modules', 'view'), async (req, res, next) => {
  try {
    const modules = await getModules();
    res.json({ status: 'ok', data: modules });
  } catch (error) {
    next(error);
  }
});

// POST /api/modules/install - Install a module package
modulesRouter.post(
  '/install',
  requirePermission('core.modules', 'manage'),
  upload.single('package'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No package file provided' });
      }

      if (
        req.file.mimetype !== 'application/zip' &&
        req.file.mimetype !== 'application/x-zip-compressed' &&
        !req.file.originalname.endsWith('.zip')
      ) {
        return res.status(400).json({ error: 'Package must be a ZIP file' });
      }

      const actorId = (req as AuthRequest).user!.id;
      const moduleRecord = await installModule(req.file.buffer, actorId);

      res.status(201).json({ status: 'ok', data: moduleRecord });
    } catch (error: unknown) {
      next(error);
    }
  },
);

// POST /api/modules/:id/enable - Enable a module
modulesRouter.post(
  '/:id/enable',
  requirePermission('core.modules', 'manage'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const actorId = (req as AuthRequest).user!.id;
      const moduleRecord = await enableModule(id as string, actorId);
      await runtime.activateModule(id as string);
      res.json({ status: 'ok', data: moduleRecord });
    } catch (error: unknown) {
      next(error);
    }
  },
);

// POST /api/modules/:id/disable - Disable a module
modulesRouter.post(
  '/:id/disable',
  requirePermission('core.modules', 'manage'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const actorId = (req as AuthRequest).user!.id;
      const moduleRecord = await disableModule(id as string, actorId);
      await runtime.deactivateModule(id as string);
      res.json({ status: 'ok', data: moduleRecord });
    } catch (error: unknown) {
      next(error);
    }
  },
);

// POST /api/modules/update - Update a module package
modulesRouter.post(
  '/update',
  requirePermission('core.modules', 'manage'),
  upload.single('package'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No package file provided' });
      }

      if (
        req.file.mimetype !== 'application/zip' &&
        req.file.mimetype !== 'application/x-zip-compressed' &&
        !req.file.originalname.endsWith('.zip')
      ) {
        return res.status(400).json({ error: 'Package must be a ZIP file' });
      }

      const actorId = (req as AuthRequest).user!.id;
      const moduleRecord = await updateModule(req.file.buffer, actorId);

      res.status(200).json({ status: 'ok', data: moduleRecord });
    } catch (error: unknown) {
      next(error);
    }
  },
);

// POST /api/modules/:id/rollback - Rollback a module to a specific version
modulesRouter.post(
  '/:id/rollback',
  requirePermission('core.modules', 'manage'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { version } = req.body;
      if (!version || typeof version !== 'string') {
        return res.status(400).json({ error: 'Valid version string is required in request body' });
      }

      const actorId = (req as AuthRequest).user!.id;
      const moduleRecord = await rollbackModule(String(id), version, actorId);
      res.json({ status: 'ok', data: moduleRecord });
    } catch (error: unknown) {
      next(error);
    }
  },
);
