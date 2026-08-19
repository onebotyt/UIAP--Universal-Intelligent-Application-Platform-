import { Request, Response, NextFunction } from 'express';
import { DeviceAuthenticator, AuthenticatedDeviceContext, logAuthAction } from '@uiap/core';

// Extend Express Request
declare module 'express-serve-static-core' {
  interface Request {
    device?: AuthenticatedDeviceContext;
  }
}

export const requireDeviceAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await logAuthAction('device.authentication_failed', null, req.ip, {
        error: 'Missing Bearer token',
      });
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const hardwareId = req.headers['x-device-id'] as string;
    if (!hardwareId) {
      await logAuthAction('device.authentication_failed', null, req.ip, {
        error: 'Missing x-device-id header',
      });
      return res.status(401).json({ error: 'Unauthorized: Missing x-device-id header' });
    }

    const secret = authHeader.split(' ')[1];

    const device = await DeviceAuthenticator.authenticate(hardwareId, secret);

    req.device = device;
    next();
  } catch (error: unknown) {
    await logAuthAction('device.authentication_failed', null, req.ip, {
      hardwareId: req.headers['x-device-id'],
      error: (error as Error).message,
    });
    res.status(401).json({ error: 'Unauthorized' });
  }
};
