import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

/**
 * Global error handling middleware.
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
