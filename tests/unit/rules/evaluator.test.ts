import { evaluateRule, evaluateAllRules } from '../../../src/rules/evaluator';
import { Rule } from '../../../src/rules/schema';
import { CollectorResult } from '../../../src/collectors/base.collector';

describe('Rule Evaluator', () => {
  const mockCollectorResults = new Map<string, CollectorResult>([
    [
      'jest',
      {
        source: 'jest',
        metrics: { coverage_percent: 87.5, pass_rate: 100, total_tests: 42 },
        raw: null,
        collectedAt: new Date(),
      },
    ],
    [
      'k6',
      {
        source: 'k6',
        metrics: { p95_latency_ms: 245, error_rate: 1.2, throughput_rps: 500 },
        raw: null,
        collectedAt: new Date(),
      },
    ],
    [
      'zap',
      {
        source: 'zap',
        metrics: { critical_vulnerabilities: 0, high_vulnerabilities: 2 },
        raw: null,
        collectedAt: new Date(),
      },
    ],
  ]);

  describe('evaluateRule', () => {
    it('should pass when coverage meets gte threshold', () => {
      const rule: Rule = {
        source: 'jest',
        metric: 'coverage_percent',
        operator: 'gte',
        threshold: 80,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(87.5);
      expect(result.severity).toBe('fail');
    });

    it('should fail when coverage is below gte threshold', () => {
      const rule: Rule = {
        source: 'jest',
        metric: 'coverage_percent',
        operator: 'gte',
        threshold: 90,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(87.5);
    });

    it('should pass when latency is within lte threshold', () => {
      const rule: Rule = {
        source: 'k6',
        metric: 'p95_latency_ms',
        operator: 'lte',
        threshold: 300,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(245);
    });

    it('should pass when vulnerabilities equals zero', () => {
      const rule: Rule = {
        source: 'zap',
        metric: 'critical_vulnerabilities',
        operator: 'eq',
        threshold: 0,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
    });

    it('should fail when vulnerabilities are not zero', () => {
      const rule: Rule = {
        source: 'zap',
        metric: 'high_vulnerabilities',
        operator: 'eq',
        threshold: 0,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(2);
    });

    it('should fail when collector source is not found', () => {
      const rule: Rule = {
        source: 'playwright',
        metric: 'pass_rate',
        operator: 'gte',
        threshold: 98,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('No results found');
    });

    it('should fail when metric is not found in collector results', () => {
      const rule: Rule = {
        source: 'jest',
        metric: 'nonexistent_metric',
        operator: 'gte',
        threshold: 0,
        severity: 'warn',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, mockCollectorResults);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle collector errors gracefully', () => {
      const errorResults = new Map<string, CollectorResult>([
        [
          'jest',
          {
            source: 'jest',
            metrics: {},
            raw: null,
            collectedAt: new Date(),
            error: 'File not found',
          },
        ],
      ]);

      const rule: Rule = {
        source: 'jest',
        metric: 'coverage_percent',
        operator: 'gte',
        threshold: 80,
        severity: 'fail',
        comparison: 'absolute',
      };

      const result = evaluateRule(rule, errorResults);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Collector error');
    });
  });

  describe('evaluateAllRules', () => {
    it('should evaluate all rules and return results', () => {
      const rules: Rule[] = [
        { source: 'jest', metric: 'coverage_percent', operator: 'gte', threshold: 80, severity: 'fail', comparison: 'absolute' },
        { source: 'k6', metric: 'p95_latency_ms', operator: 'lte', threshold: 300, severity: 'fail', comparison: 'absolute' },
        { source: 'zap', metric: 'critical_vulnerabilities', operator: 'eq', threshold: 0, severity: 'fail', comparison: 'absolute' },
      ];

      const results = evaluateAllRules(rules, mockCollectorResults);

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
      expect(results[2].passed).toBe(true);
    });

    it('should correctly identify mixed pass/fail results', () => {
      const rules: Rule[] = [
        { source: 'jest', metric: 'coverage_percent', operator: 'gte', threshold: 90, severity: 'fail', comparison: 'absolute' },
        { source: 'k6', metric: 'p95_latency_ms', operator: 'lte', threshold: 300, severity: 'warn', comparison: 'absolute' },
      ];

      const results = evaluateAllRules(rules, mockCollectorResults);

      expect(results[0].passed).toBe(false);
      expect(results[0].severity).toBe('fail');
      expect(results[1].passed).toBe(true);
    });
  });
});
