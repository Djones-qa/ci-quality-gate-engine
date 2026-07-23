import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface PlaywrightSuite {
  title: string;
  specs: Array<{
    title: string;
    tests: Array<{
      status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
      duration: number;
    }>;
  }>;
  suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
  stats: {
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
    duration: number;
  };
  suites: PlaywrightSuite[];
}

export class PlaywrightCollector extends BaseCollector {
  readonly name = 'playwright';
  readonly supportedMetrics = [
    'pass_rate',
    'total_tests',
    'passed_tests',
    'failed_tests',
    'flaky_tests',
    'flaky_percent',
    'skipped_tests',
    'duration_ms',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for Playwright collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: PlaywrightReport = JSON.parse(raw);

      if (!this.validate(data)) {
        return this.buildError('Invalid Playwright report format');
      }

      const { expected, unexpected, flaky, skipped, duration } = data.stats;
      const totalTests = expected + unexpected + flaky + skipped;
      const passRate = totalTests > 0 ? ((expected + flaky) / totalTests) * 100 : 0;
      const flakyPercent = totalTests > 0 ? (flaky / totalTests) * 100 : 0;

      return this.buildResult(
        {
          pass_rate: Math.round(passRate * 100) / 100,
          total_tests: totalTests,
          passed_tests: expected,
          failed_tests: unexpected,
          flaky_tests: flaky,
          flaky_percent: Math.round(flakyPercent * 100) / 100,
          skipped_tests: skipped,
          duration_ms: duration,
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect Playwright results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const report = data as Record<string, unknown>;
    return (
      report.stats !== undefined &&
      typeof report.stats === 'object' &&
      Array.isArray(report.suites)
    );
  }
}
