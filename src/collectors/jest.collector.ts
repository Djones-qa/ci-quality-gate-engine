import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface JestCoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

interface JestTestResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: Array<{
    testFilePath: string;
    numPassingTests: number;
    numFailingTests: number;
    perfStats: { runtime: number };
  }>;
  coverageMap?: JestCoverageSummary;
}

export class JestCollector extends BaseCollector {
  readonly name = 'jest';
  readonly supportedMetrics = [
    'coverage_percent',
    'pass_rate',
    'total_tests',
    'passed_tests',
    'failed_tests',
    'pending_tests',
    'duration_ms',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for Jest collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: JestTestResult = JSON.parse(raw);

      if (!this.validate(data)) {
        return this.buildError('Invalid Jest report format');
      }

      const totalTests = data.numTotalTests;
      const passRate = totalTests > 0 ? (data.numPassedTests / totalTests) * 100 : 0;
      const totalDuration = data.testResults.reduce(
        (sum, r) => sum + (r.perfStats?.runtime || 0),
        0,
      );

      const coveragePercent = data.coverageMap?.total?.lines?.pct ?? 0;

      return this.buildResult(
        {
          coverage_percent: Math.round(coveragePercent * 100) / 100,
          pass_rate: Math.round(passRate * 100) / 100,
          total_tests: totalTests,
          passed_tests: data.numPassedTests,
          failed_tests: data.numFailedTests,
          pending_tests: data.numPendingTests,
          duration_ms: totalDuration,
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect Jest results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const report = data as Record<string, unknown>;
    return (
      typeof report.numTotalTests === 'number' &&
      typeof report.numPassedTests === 'number' &&
      typeof report.numFailedTests === 'number' &&
      Array.isArray(report.testResults)
    );
  }
}
