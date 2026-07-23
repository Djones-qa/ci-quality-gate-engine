import { Rule, Severity } from './schema';
import { evaluateOperator } from './operators';
import { CollectorResult } from '../collectors/base.collector';
import { logger } from '../config/logger';

export interface RuleEvaluationResult {
  rule: Rule;
  passed: boolean;
  actualValue: number;
  expectedThreshold: number | number[];
  severity: Severity;
  message: string;
}

/**
 * Evaluate a single rule against collected metrics.
 */
export function evaluateRule(
  rule: Rule,
  collectorResults: Map<string, CollectorResult>,
): RuleEvaluationResult {
  const collectorResult = collectorResults.get(rule.source);

  if (!collectorResult) {
    return {
      rule,
      passed: false,
      actualValue: -1,
      expectedThreshold: rule.threshold,
      severity: rule.severity,
      message: `No results found for source: ${rule.source}`,
    };
  }

  if (collectorResult.error) {
    return {
      rule,
      passed: false,
      actualValue: -1,
      expectedThreshold: rule.threshold,
      severity: rule.severity,
      message: `Collector error for ${rule.source}: ${collectorResult.error}`,
    };
  }

  const metricValue = collectorResult.metrics[rule.metric];

  if (metricValue === undefined) {
    return {
      rule,
      passed: false,
      actualValue: -1,
      expectedThreshold: rule.threshold,
      severity: rule.severity,
      message: `Metric "${rule.metric}" not found in ${rule.source} results`,
    };
  }

  const numericValue = typeof metricValue === 'number' ? metricValue : Number(metricValue);

  if (isNaN(numericValue)) {
    return {
      rule,
      passed: false,
      actualValue: -1,
      expectedThreshold: rule.threshold,
      severity: rule.severity,
      message: `Metric "${rule.metric}" from ${rule.source} is not numeric: ${metricValue}`,
    };
  }

  const passed = evaluateOperator(rule.operator, numericValue, rule.threshold);
  const thresholdStr = Array.isArray(rule.threshold)
    ? `[${rule.threshold.join(', ')}]`
    : rule.threshold.toString();

  const message = passed
    ? `✅ ${rule.source}.${rule.metric}: ${numericValue} ${rule.operator} ${thresholdStr}`
    : `❌ ${rule.source}.${rule.metric}: ${numericValue} (expected ${rule.operator} ${thresholdStr})`;

  logger.debug(message);

  return {
    rule,
    passed,
    actualValue: numericValue,
    expectedThreshold: rule.threshold,
    severity: rule.severity,
    message,
  };
}

/**
 * Evaluate all rules for an environment against collected metrics.
 */
export function evaluateAllRules(
  rules: Rule[],
  collectorResults: Map<string, CollectorResult>,
): RuleEvaluationResult[] {
  return rules.map((rule) => evaluateRule(rule, collectorResults));
}
