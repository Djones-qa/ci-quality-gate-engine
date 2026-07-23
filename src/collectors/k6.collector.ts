import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface K6Metric {
  avg: number;
  min: number;
  med: number;
  max: number;
  'p(90)': number;
  'p(95)': number;
  'p(99)': number;
}

interface K6Summary {
  metrics: {
    http_req_duration?: { values: K6Metric };
    http_req_failed?: { values: { rate: number } };
    http_reqs?: { values: { count: number; rate: number } };
    iterations?: { values: { count: number; rate: number } };
    vus?: { values: { value: number; min: number; max: number } };
  };
  root_group?: {
    checks?: Array<{ name: string; passes: number; fails: number }>;
  };
}

export class K6Collector extends BaseCollector {
  readonly name = 'k6';
  readonly supportedMetrics = [
    'p95_latency_ms',
    'p99_latency_ms',
    'avg_latency_ms',
    'error_rate',
    'throughput_rps',
    'total_requests',
    'max_vus',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for k6 collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: K6Summary = JSON.parse(raw);

      if (!this.validate(data)) {
        return this.buildError('Invalid k6 summary format');
      }

      const duration = data.metrics.http_req_duration?.values;
      const failed = data.metrics.http_req_failed?.values;
      const reqs = data.metrics.http_reqs?.values;
      const vus = data.metrics.vus?.values;

      return this.buildResult(
        {
          p95_latency_ms: Math.round((duration?.['p(95)'] ?? 0) * 100) / 100,
          p99_latency_ms: Math.round((duration?.['p(99)'] ?? 0) * 100) / 100,
          avg_latency_ms: Math.round((duration?.avg ?? 0) * 100) / 100,
          error_rate: Math.round((failed?.rate ?? 0) * 10000) / 100,
          throughput_rps: Math.round((reqs?.rate ?? 0) * 100) / 100,
          total_requests: reqs?.count ?? 0,
          max_vus: vus?.max ?? 0,
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect k6 results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const summary = data as Record<string, unknown>;
    return summary.metrics !== undefined && typeof summary.metrics === 'object';
  }
}
