import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler.
 * All errors funnel through here so we always return a consistent shape.
 * In production, internal error details are never leaked to the client.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires 4-param signature for error middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Zod validation error (should be caught in routes, but just in case)
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten(),
    });
    return;
  }

  // Prisma unique constraint violation
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  ) {
    res.status(409).json({
      success: false,
      error: 'A record with these values already exists',
      code: 'DUPLICATE',
    });
    return;
  }

  // Unknown error — log full details, return generic message
  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : err,
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDev && err instanceof Error ? { detail: err.message } : {}),
  });
}
