import { GateConfig, Environment } from '../rules/schema';
import { evaluateAllRules } from '../rules/evaluator';
import { aggregateResults, AggregatorInput } from './aggregator';
import { makeDecision, GateDecision } from './decision';
import { logger } from '../config/logger';

export interface GateEvaluationRequest {
  buildId: string;
  environment: string;
  sources: AggregatorInput;
}

export interface GateEvaluationResponse {
  decision: GateDecision;
  collectedSources: string[];
  duration: number;
}

/**
 * Main gate engine — orchestrates collection, evaluation, and decision.
 */
export class GateEngine {
  private config: GateConfig;

  constructor(config: GateConfig) {
    this.config = config;
  }

  /**
   * Evaluate a gate for a specific build and environment.
   */
  async evaluate(request: GateEvaluationRequest): Promise<GateEvaluationResponse> {
    const startTime = Date.now();
    const { buildId, environment, sources } = request;

    logger.info(`Evaluating gate for build ${buildId} in environment: ${environment}`);

    // Validate environment exists in config
    const envConfig = this.config.environments[environment];
    if (!envConfig) {
      const available = Object.keys(this.config.environments).join(', ');
      throw new Error(
        `Environment "${environment}" not found in gate config. Available: ${available}`,
      );
    }

    // Step 1: Collect results from all sources
    const collectorResults = await aggregateResults(sources);

    // Step 2: Evaluate all rules against collected metrics
    const ruleResults = evaluateAllRules(envConfig.rules, collectorResults);

    // Step 3: Make a decision based on strategy
    const decision = makeDecision(ruleResults, {
      environment,
      strategy: envConfig.strategy,
      buildId,
      minimumScore: envConfig.minimum_score,
      requiresApprovalOnWarn: envConfig.requires_approval_on_warn,
      rollbackOnFail: envConfig.rollback_on_fail,
    });

    const duration = Date.now() - startTime;

    logger.info(`Gate evaluation completed in ${duration}ms — verdict: ${decision.verdict}`);

    return {
      decision,
      collectedSources: Array.from(collectorResults.keys()),
      duration,
    };
  }

  /**
   * Get available environments from the config.
   */
  getEnvironments(): string[] {
    return Object.keys(this.config.environments);
  }

  /**
   * Get the config for a specific environment.
   */
  getEnvironmentConfig(environment: string): Environment | undefined {
    return this.config.environments[environment];
  }

  /**
   * Get the full gate config.
   */
  getConfig(): GateConfig {
    return this.config;
  }
}
