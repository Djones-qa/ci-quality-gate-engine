import { RuleEvaluationResult } from '../rules/evaluator';
import { Strategy } from '../rules/schema';
import { logger } from '../config/logger';

export type Verdict = 'pass' | 'warn' | 'fail' | 'rollback';

export interface GateDecision {
  verdict: Verdict;
  score: number;
  environment: string;
  strategy: Strategy;
  buildId: string;
  results: RuleEvaluationResult[];
  summary: {
    total_rules: number;
    passed_rules: number;
    failed_rules: number;
    warned_rules: number;
  };
  timestamp: Date;
  requiresApproval: boolean;
  triggersRollback: boolean;
}

export interface DecisionOptions {
  environment: string;
  strategy: Strategy;
  buildId: string;
  minimumScore?: number;
  requiresApprovalOnWarn?: boolean;
  rollbackOnFail?: boolean;
}

/**
 * Produce a gate decision from evaluated rules.
 */
export function makeDecision(
  results: RuleEvaluationResult[],
  options: DecisionOptions,
): GateDecision {
  const { environment, strategy, buildId, minimumScore, requiresApprovalOnWarn, rollbackOnFail } =
    options;

  const failedRules = results.filter((r) => !r.passed && r.severity === 'fail');
  const warnedRules = results.filter((r) => !r.passed && r.severity === 'warn');
  const passedRules = results.filter((r) => r.passed);

  let verdict: Verdict;
  let score: number;

  switch (strategy) {
    case 'any-fail-blocks':
      score = results.length > 0 ? (passedRules.length / results.length) * 100 : 0;
      if (failedRules.length > 0) {
        verdict = 'fail';
      } else if (warnedRules.length > 0) {
        verdict = 'warn';
      } else {
        verdict = 'pass';
      }
      break;

    case 'weighted-score':
      score = calculateWeightedScore(results);
      if (score < (minimumScore ?? 80)) {
        verdict = failedRules.length > 0 ? 'fail' : 'warn';
      } else if (warnedRules.length > 0) {
        verdict = 'warn';
      } else {
        verdict = 'pass';
      }
      break;

    case 'zero-tolerance':
      score = failedRules.length === 0 && warnedRules.length === 0 ? 100 : 0;
      if (failedRules.length > 0) {
        verdict = 'fail';
      } else if (warnedRules.length > 0) {
        verdict = 'warn';
      } else {
        verdict = 'pass';
      }
      break;

    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  const triggersRollback = verdict === 'fail' && (rollbackOnFail ?? false);
  if (triggersRollback) {
    verdict = 'rollback';
  }

  const requiresApproval = verdict === 'warn' && (requiresApprovalOnWarn ?? false);

  const decision: GateDecision = {
    verdict,
    score: Math.round(score * 100) / 100,
    environment,
    strategy,
    buildId,
    results,
    summary: {
      total_rules: results.length,
      passed_rules: passedRules.length,
      failed_rules: failedRules.length,
      warned_rules: warnedRules.length,
    },
    timestamp: new Date(),
    requiresApproval,
    triggersRollback,
  };

  logger.info(`Gate verdict: ${verdict.toUpperCase()} (score: ${decision.score})`);

  return decision;
}

/**
 * Calculate weighted score from rule results.
 */
function calculateWeightedScore(results: RuleEvaluationResult[]): number {
  const weightedResults = results.filter((r) => r.rule.weight !== undefined && r.rule.weight > 0);

  if (weightedResults.length === 0) {
    // Fall back to simple pass rate if no weights defined
    const passed = results.filter((r) => r.passed).length;
    return results.length > 0 ? (passed / results.length) * 100 : 0;
  }

  const totalWeight = weightedResults.reduce((sum, r) => sum + (r.rule.weight ?? 0), 0);
  const earnedWeight = weightedResults
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + (r.rule.weight ?? 0), 0);

  return totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
}
