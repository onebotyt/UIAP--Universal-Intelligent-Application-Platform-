import { Router, Request, Response } from 'express';
import { BackupManager, logAuthAction } from '@uiap/core';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';

export const backupsRouter = Router();

// List backups
backupsRouter.get(
  '/',
  requireAuth,
  requirePermission('backup', 'view'),
  async (req: Request, res: Response) => {
    try {
      const backups = await BackupManager.listBackups();
      res.json(backups);
    } catch (error: unknown) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// Get backup metadata
backupsRouter.get(
  '/:id',
  requireAuth,
  requirePermission('backup', 'view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const backup = await BackupManager.getBackup(req.params.id as string);
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }
      res.json(backup);
    } catch (error: unknown) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// Create backup
backupsRouter.post(
  '/',
  requireAuth,
  requirePermission('backup', 'create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const actorId = req.user!.id;
      await logAuthAction('backup.create_started', actorId);

      const backup = await BackupManager.createBackup();

      await logAuthAction('backup.create_completed', actorId, null, { backup_id: backup.id });
      res.status(201).json(backup);
    } catch (error: unknown) {
      const actorId = req.user!.id;
      await logAuthAction('backup.create_failed', actorId, null, {
        error: (error as Error).message,
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// Restore backup
backupsRouter.post(
  '/:id/restore',
  requireAuth,
  requirePermission('backup', 'restore'),
  async (req: AuthRequest, res: Response) => {
    try {
      const actorId = req.user!.id;
      const backupId = String(req.params.id);

      await logAuthAction('backup.restore_started', actorId, null, { backup_id: backupId });

      await BackupManager.restoreBackup(backupId);

      await logAuthAction('backup.restore_completed', actorId, null, { backup_id: backupId });
      res.json({ message: 'Backup restored successfully' });
    } catch (error: unknown) {
      const actorId = req.user!.id;
      await logAuthAction('backup.restore_failed', actorId, null, {
        backup_id: req.params.id,
        error: (error as Error).message,
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// Delete backup
backupsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('backup', 'delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const actorId = req.user!.id;
      const backupId = String(req.params.id);

      const backup = await BackupManager.getBackup(backupId);
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }

      await BackupManager.deleteBackup(backupId);
      await logAuthAction('backup.deleted', actorId, null, { backup_id: backupId });
      res.json({ message: 'Backup deleted successfully' });
    } catch (error: unknown) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
