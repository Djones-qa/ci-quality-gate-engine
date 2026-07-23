import express from 'express';
import cors from 'cors';
import { gatesRouter } from './routes/gates.routes';
import { historyRouter } from './routes/history.routes';
import { healthRouter } from './routes/health.routes';
import { authMiddleware } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { loadAppConfig } from '../config/loader';
import { logger } from '../config/logger';

const app = express();
const config = loadAppConfig();

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.use('/api', healthRouter);

// Protected routes
app.use('/api/gates', authMiddleware, gatesRouter);
app.use('/api/history', authMiddleware, historyRouter);

// Error handling
app.use(errorMiddleware);

/**
 * Start the API server.
 */
export function startServer(): void {
  app.listen(config.port, () => {
    logger.info(`CI Quality Gate Engine running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Health check: http://localhost:${config.port}/api/health`);
  });
}

export { app };
