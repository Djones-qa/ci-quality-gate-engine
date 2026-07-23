/**
 * Default configuration values for the quality gate engine.
 */

export const DEFAULT_PORT = 3000;

export const DEFAULT_THRESHOLDS = {
  jest: {
    coverage_percent: 80,
    pass_rate: 100,
  },
  playwright: {
    pass_rate: 98,
    flaky_percent: 2,
  },
  k6: {
    p95_latency_ms: 500,
    p99_latency_ms: 1000,
    error_rate: 5,
  },
  zap: {
    critical_vulnerabilities: 0,
    high_vulnerabilities: 0,
  },
  axe: {
    critical_violations: 0,
    serious_violations: 0,
  },
  pact: {
    breaking_changes: 0,
    verification_pass_rate: 100,
  },
  lighthouse: {
    performance_score: 90,
    accessibility_score: 90,
  },
};

export const DEFAULT_ENVIRONMENTS = ['canary', 'staging', 'production'] as const;

export const DEFAULT_STRATEGIES = {
  canary: 'any-fail-blocks',
  staging: 'weighted-score',
  production: 'zero-tolerance',
} as const;
