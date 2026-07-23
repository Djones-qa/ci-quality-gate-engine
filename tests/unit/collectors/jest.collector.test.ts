import { JestCollector } from '../../../src/collectors/jest.collector';
import { writeFileSync, mkdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

describe('JestCollector', () => {
  const collector = new JestCollector();
  const tmpDir = join(__dirname, '../../fixtures/tmp');
  const tmpFile = join(tmpDir, 'jest-test.json');

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    try {
      unlinkSync(tmpFile);
      rmdirSync(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  });

  it('should have correct name', () => {
    expect(collector.name).toBe('jest');
  });

  it('should list supported metrics', () => {
    expect(collector.supportedMetrics).toContain('coverage_percent');
    expect(collector.supportedMetrics).toContain('pass_rate');
    expect(collector.supportedMetrics).toContain('total_tests');
  });

  it('should collect metrics from a valid Jest report', async () => {
    const report = {
      numTotalTests: 50,
      numPassedTests: 48,
      numFailedTests: 2,
      numPendingTests: 0,
      testResults: [
        { testFilePath: 'test1.ts', numPassingTests: 25, numFailingTests: 1, perfStats: { runtime: 1500 } },
        { testFilePath: 'test2.ts', numPassingTests: 23, numFailingTests: 1, perfStats: { runtime: 2000 } },
      ],
      coverageMap: {
        total: {
          lines: { pct: 87.5 },
          statements: { pct: 86.2 },
          functions: { pct: 90.1 },
          branches: { pct: 78.3 },
        },
      },
    };

    writeFileSync(tmpFile, JSON.stringify(report));

    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeUndefined();
    expect(result.source).toBe('jest');
    expect(result.metrics.coverage_percent).toBe(87.5);
    expect(result.metrics.pass_rate).toBe(96);
    expect(result.metrics.total_tests).toBe(50);
    expect(result.metrics.passed_tests).toBe(48);
    expect(result.metrics.failed_tests).toBe(2);
    expect(result.metrics.duration_ms).toBe(3500);
  });

  it('should return error when reportPath is missing', async () => {
    const result = await collector.collect({});

    expect(result.error).toBeDefined();
    expect(result.error).toContain('reportPath is required');
  });

  it('should return error for invalid JSON', async () => {
    writeFileSync(tmpFile, 'not valid json');

    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to collect');
  });

  it('should return error for invalid report format', async () => {
    writeFileSync(tmpFile, JSON.stringify({ foo: 'bar' }));

    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid Jest report format');
  });

  it('should validate a correct report structure', () => {
    const valid = {
      numTotalTests: 10,
      numPassedTests: 10,
      numFailedTests: 0,
      testResults: [],
    };

    expect(collector.validate(valid)).toBe(true);
  });

  it('should reject invalid report structures', () => {
    expect(collector.validate(null)).toBe(false);
    expect(collector.validate({})).toBe(false);
    expect(collector.validate({ numTotalTests: 10 })).toBe(false);
  });
});
