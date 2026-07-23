import { Request, Response, NextFunction } from 'express';
import { loadAppConfig } from '../../config/loader';
import { logger } from '../../config/logger';

/**
 * API key authentication middleware.
 * Validates the Authorization header: Bearer <api-key>
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = loadAppConfig();

  // Skip auth in development if no API key is configured
  if (!config.auth.apiKey && config.nodeEnv === 'development') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header is required' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <api-key>' });
    return;
  }

  if (token !== config.auth.apiKey) {
    logger.warn(`Unauthorized request from ${req.ip}`);
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
