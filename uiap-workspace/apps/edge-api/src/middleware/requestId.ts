import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  let reqId: string;

  // Accept only alphanumeric characters and hyphens, up to 64 characters.
  if (typeof incomingId === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(incomingId)) {
    reqId = incomingId;
  } else {
    reqId = crypto.randomUUID();
  }

  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  next();
}
