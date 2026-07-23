import { makeDecision, DecisionOptions } from '../../../src/engine/decision';
import { RuleEvaluationResult } from '../../../src/rules/evaluator';
import { Rule } from '../../../src/rules/schema';

describe('Decision Engine', () => {
  const buildRule = (source: string, metric: string, weight?: number): Rule => ({
    source,
    metric,
    operator: 'gte',
    threshold: 80,
    severity: 'fail',
    weight,
    comparison: 'absolute',
  });

  const buildResult = (rule: Rule, passed: boolean, value: number): RuleEvaluationResult => ({
    rule,
    passed,
    actualValue: value,
    expectedThreshold: rule.threshold,
    severity: rule.severity,
    message: passed ? `✅ ${rule.source}.${rule.metric}` : `❌ ${rule.source}.${rule.metric}`,
  });

  describe('any-fail-blocks strategy', () => {
    const options: DecisionOptions = {
      environment: 'staging',
      strategy: 'any-fail-blocks',
      buildId: 'test-123',
    };

    it('should pass when all rules pass', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage'), true, 90),
        buildResult(buildRule('k6', 'latency'), true, 200),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('pass');
      expect(decision.summary.passed_rules).toBe(2);
      expect(decision.summary.failed_rules).toBe(0);
    });

    it('should fail when any rule fails', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage'), true, 90),
        buildResult(buildRule('k6', 'latency'), false, 600),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('fail');
      expect(decision.summary.failed_rules).toBe(1);
    });

    it('should warn when only warn-severity rules fail', () => {
      const warnRule: Rule = { ...buildRule('k6', 'latency'), severity: 'warn' };
      const results = [
        buildResult(buildRule('jest', 'coverage'), true, 90),
        buildResult(warnRule, false, 600),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('warn');
    });
  });

  describe('weighted-score strategy', () => {
    const options: DecisionOptions = {
      environment: 'staging',
      strategy: 'weighted-score',
      buildId: 'test-456',
      minimumScore: 80,
    };

    it('should pass when weighted score meets minimum', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage', 60), true, 90),
        buildResult(buildRule('k6', 'latency', 40), true, 200),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('pass');
      expect(decision.score).toBe(100);
    });

    it('should fail when weighted score is below minimum', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage', 30), true, 90),
        buildResult(buildRule('k6', 'latency', 70), false, 600),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('fail');
      expect(decision.score).toBeLessThan(80);
    });

    it('should calculate correct weighted score', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage', 50), true, 90),
        buildResult(buildRule('k6', 'latency', 50), false, 600),
      ];

      const decision = makeDecision(results, options);

      expect(decision.score).toBe(50);
    });
  });

  describe('zero-tolerance strategy', () => {
    const options: DecisionOptions = {
      environment: 'production',
      strategy: 'zero-tolerance',
      buildId: 'test-789',
      rollbackOnFail: true,
    };

    it('should pass only when all rules pass with no warnings', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage'), true, 90),
        buildResult(buildRule('zap', 'vulns'), true, 0),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('pass');
      expect(decision.score).toBe(100);
    });

    it('should trigger rollback when a rule fails and rollbackOnFail is true', () => {
      const results = [
        buildResult(buildRule('jest', 'coverage'), true, 90),
        buildResult(buildRule('zap', 'vulns'), false, 3),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('rollback');
      expect(decision.triggersRollback).toBe(true);
    });
  });

  describe('approval requirement', () => {
    it('should require approval on warn when configured', () => {
      const options: DecisionOptions = {
        environment: 'staging',
        strategy: 'any-fail-blocks',
        buildId: 'test-approval',
        requiresApprovalOnWarn: true,
      };

      const warnRule: Rule = { ...buildRule('k6', 'latency'), severity: 'warn' };
      const results = [
        buildResult(buildRule('jest', 'coverage'), true, 90),
        buildResult(warnRule, false, 600),
      ];

      const decision = makeDecision(results, options);

      expect(decision.verdict).toBe('warn');
      expect(decision.requiresApproval).toBe(true);
    });
  });
});
