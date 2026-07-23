import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GateEngine } from '../../engine/gate.engine';
import { parseGateConfig } from '../../rules/parser';
import { logger } from '../../config/logger';

export const gatesRouter = Router();

const EvaluateRequestSchema = z.object({
  buildId: z.string(),
  environment: z.string(),
  configPath: z.string().optional(),
  sources: z.record(
    z.string(),
    z.object({
      reportPath: z.string().optional(),
      reportUrl: z.string().optional(),
      options: z.record(z.unknown()).optional(),
    }),
  ),
});

/**
 * POST /api/gates/evaluate
 * Evaluate a quality gate for a build.
 */
gatesRouter.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const body = EvaluateRequestSchema.parse(req.body);
    const configPath = body.configPath || 'gate-config.yml';

    const gateConfig = await parseGateConfig(configPath);
    const engine = new GateEngine(gateConfig);

    const response = await engine.evaluate({
      buildId: body.buildId,
      environment: body.environment,
      sources: body.sources,
    });

    const statusCode = response.decision.verdict === 'pass' ? 200 : 422;

    res.status(statusCode).json({
      success: response.decision.verdict === 'pass',
      verdict: response.decision.verdict,
      decision: response.decision,
      collectedSources: response.collectedSources,
      duration: response.duration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request body',
        details: error.issues,
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Gate evaluation failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/gates/environments
 * List available environments from the config.
 */
gatesRouter.get('/environments', async (req: Request, res: Response) => {
  try {
    const configPath = (req.query.config as string) || 'gate-config.yml';
    const gateConfig = await parseGateConfig(configPath);
    const engine = new GateEngine(gateConfig);

    res.json({
      name: gateConfig.name,
      version: gateConfig.version,
      environments: engine.getEnvironments(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
