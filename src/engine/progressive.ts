import { GateEngine } from './gate.engine';
import { GateDecision } from './decision';
import { AggregatorInput } from './aggregator';
import { logger } from '../config/logger';

export interface ProgressiveGateResult {
  buildId: string;
  stages: StageResult[];
  finalVerdict: 'pass' | 'warn' | 'fail' | 'rollback';
  completedStages: number;
  totalStages: number;
  stoppedAt?: string;
}

export interface StageResult {
  environment: string;
  decision: GateDecision;
  passed: boolean;
}

/**
 * Progressive delivery gate — evaluates environments in sequence,
 * stopping at the first failure.
 */
export class ProgressiveGate {
  private engine: GateEngine;
  private pipeline: string[];

  /**
   * @param engine - Gate engine instance with loaded config
   * @param pipeline - Ordered list of environments (e.g., ['canary', 'staging', 'production'])
   */
  constructor(engine: GateEngine, pipeline: string[]) {
    this.engine = engine;
    this.pipeline = pipeline;

    // Validate all pipeline environments exist
    const available = engine.getEnvironments();
    for (const env of pipeline) {
      if (!available.includes(env)) {
        throw new Error(
          `Pipeline environment "${env}" not found in config. Available: ${available.join(', ')}`,
        );
      }
    }
  }

  /**
   * Run all stages in the progressive pipeline.
   * Stops at the first failing gate.
   */
  async run(buildId: string, sources: AggregatorInput): Promise<ProgressiveGateResult> {
    const stages: StageResult[] = [];
    let stoppedAt: string | undefined;

    logger.info(`Starting progressive gate for build ${buildId}`);
    logger.info(`Pipeline: ${this.pipeline.join(' → ')}`);

    for (const environment of this.pipeline) {
      logger.info(`Evaluating stage: ${environment}`);

      const response = await this.engine.evaluate({
        buildId,
        environment,
        sources,
      });

      const passed = response.decision.verdict === 'pass' || response.decision.verdict === 'warn';

      stages.push({
        environment,
        decision: response.decision,
        passed,
      });

      if (!passed) {
        stoppedAt = environment;
        logger.warn(`Pipeline stopped at ${environment} — verdict: ${response.decision.verdict}`);
        break;
      }

      logger.info(`Stage ${environment} passed — proceeding to next`);
    }

    const finalVerdict = stoppedAt
      ? stages[stages.length - 1].decision.verdict
      : 'pass';

    const result: ProgressiveGateResult = {
      buildId,
      stages,
      finalVerdict,
      completedStages: stages.length,
      totalStages: this.pipeline.length,
      stoppedAt,
    };

    logger.info(
      `Progressive gate complete: ${stages.length}/${this.pipeline.length} stages — final: ${finalVerdict}`,
    );

    return result;
  }
}
