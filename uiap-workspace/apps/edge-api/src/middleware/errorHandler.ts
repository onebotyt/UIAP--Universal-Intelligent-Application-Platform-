import { Request, Response, NextFunction } from 'express';

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    requestId: string;
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiErrorResponse = {
    error: {
      message: 'The requested resource was not found on this server.',
      code: 'NOT_FOUND',
      requestId: req.id || 'unknown',
    },
  };
  res.status(404).json(response);
}

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void next; // explicitly consume unused parameter to satisfy linter
  // Log the actual internal error for debugging (won't be exposed to the client)
  console.error(`[UIAP Edge API] Error RequestId: ${req.id || 'unknown'}`);
  console.error(err);

  const response: ApiErrorResponse = {
    error: {
      message: 'An internal server error occurred.',
      code: 'INTERNAL_SERVER_ERROR',
      requestId: req.id || 'unknown',
    },
  };

  res.status(500).json(response);
}
