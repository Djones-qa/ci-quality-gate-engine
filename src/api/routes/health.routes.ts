import { Router, Request, Response } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

/**
 * GET /api/health
 * Basic health check — is the process alive?
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /api/ready
 * Readiness probe — are dependencies connected?
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
  };

  // TODO: Add actual connectivity checks
  // For now, report as ready (dependencies optional in dev mode)
  const isReady = process.env.NODE_ENV === 'development' || (checks.database && checks.redis);

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    checks,
    timestamp: new Date().toISOString(),
  });
});
