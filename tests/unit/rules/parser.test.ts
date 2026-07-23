import { parseGateConfigFromString } from '../../../src/rules/parser';

describe('Gate Config Parser', () => {
  const validConfig = `
version: "1.0"
name: "Test Gate"
environments:
  staging:
    strategy: "any-fail-blocks"
    rules:
      - source: jest
        metric: coverage_percent
        operator: gte
        threshold: 80
        severity: fail
      - source: k6
        metric: p95_latency_ms
        operator: lte
        threshold: 300
        severity: warn
  production:
    strategy: "zero-tolerance"
    rollback_on_fail: true
    rules:
      - source: jest
        metric: coverage_percent
        operator: gte
        threshold: 90
        severity: fail
`;

  it('should parse a valid YAML config', () => {
    const config = parseGateConfigFromString(validConfig);

    expect(config.version).toBe('1.0');
    expect(config.name).toBe('Test Gate');
    expect(Object.keys(config.environments)).toHaveLength(2);
  });

  it('should parse environment strategies', () => {
    const config = parseGateConfigFromString(validConfig);

    expect(config.environments.staging.strategy).toBe('any-fail-blocks');
    expect(config.environments.production.strategy).toBe('zero-tolerance');
  });

  it('should parse rules with all properties', () => {
    const config = parseGateConfigFromString(validConfig);
    const stagingRules = config.environments.staging.rules;

    expect(stagingRules).toHaveLength(2);
    expect(stagingRules[0].source).toBe('jest');
    expect(stagingRules[0].metric).toBe('coverage_percent');
    expect(stagingRules[0].operator).toBe('gte');
    expect(stagingRules[0].threshold).toBe(80);
    expect(stagingRules[0].severity).toBe('fail');
  });

  it('should parse rollback_on_fail flag', () => {
    const config = parseGateConfigFromString(validConfig);

    expect(config.environments.production.rollback_on_fail).toBe(true);
    expect(config.environments.staging.rollback_on_fail).toBe(false);
  });

  it('should throw on invalid YAML', () => {
    const invalidYaml = 'this is: [not: valid: yaml';

    expect(() => parseGateConfigFromString(invalidYaml)).toThrow();
  });

  it('should throw on missing required fields', () => {
    const missingFields = `
version: "1.0"
name: "Test"
`;

    expect(() => parseGateConfigFromString(missingFields)).toThrow('Invalid gate configuration');
  });

  it('should throw on invalid operator', () => {
    const invalidOperator = `
version: "1.0"
name: "Test"
environments:
  staging:
    strategy: "any-fail-blocks"
    rules:
      - source: jest
        metric: coverage
        operator: invalid_op
        threshold: 80
        severity: fail
`;

    expect(() => parseGateConfigFromString(invalidOperator)).toThrow();
  });

  it('should parse weighted-score strategy with minimum_score', () => {
    const weightedConfig = `
version: "1.0"
name: "Weighted Gate"
environments:
  staging:
    strategy: "weighted-score"
    minimum_score: 85
    rules:
      - source: jest
        metric: coverage_percent
        operator: gte
        threshold: 80
        weight: 30
        severity: fail
      - source: k6
        metric: p95_latency_ms
        operator: lte
        threshold: 500
        weight: 70
        severity: fail
`;

    const config = parseGateConfigFromString(weightedConfig);

    expect(config.environments.staging.strategy).toBe('weighted-score');
    expect(config.environments.staging.minimum_score).toBe(85);
    expect(config.environments.staging.rules[0].weight).toBe(30);
    expect(config.environments.staging.rules[1].weight).toBe(70);
  });
});
