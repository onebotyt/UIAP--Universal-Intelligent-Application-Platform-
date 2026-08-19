import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserPermissions, Permission } from '@uiap/core';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    permissions?: Permission[];
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED', requestId: req.id },
    });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'local_dev_secret_uiap_2026';
    const payload = verifyToken(token, secret);
    req.user = { id: payload.userId };
    next();
  } catch {
    res.status(401).json({
      error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED', requestId: req.id },
    });
  }
}

export function requirePermission(moduleName: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      res.status(401).json({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED', requestId: req.id },
      });
      return;
    }

    try {
      if (!req.user.permissions) {
        req.user.permissions = await getUserPermissions(req.user.id);
      }

      const hasPermission = req.user!.permissions!.some(
        (p) => p.module_name === moduleName && p.action === action,
      );

      if (!hasPermission) {
        res.status(403).json({
          error: { message: 'Permission denied', code: 'FORBIDDEN', requestId: req.id },
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
