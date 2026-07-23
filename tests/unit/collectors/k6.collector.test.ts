import { K6Collector } from '../../../src/collectors/k6.collector';
import { writeFileSync, mkdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

describe('K6Collector', () => {
  const collector = new K6Collector();
  const tmpDir = join(__dirname, '../../fixtures/tmp');
  const tmpFile = join(tmpDir, 'k6-test.json');

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
    expect(collector.name).toBe('k6');
  });

  it('should collect metrics from a valid k6 summary', async () => {
    const summary = {
      metrics: {
        http_req_duration: {
          values: {
            avg: 125.5,
            min: 10.2,
            med: 100.0,
            max: 2500.0,
            'p(90)': 220.0,
            'p(95)': 310.5,
            'p(99)': 890.0,
          },
        },
        http_req_failed: {
          values: { rate: 0.023 },
        },
        http_reqs: {
          values: { count: 15000, rate: 250.5 },
        },
        vus: {
          values: { value: 50, min: 1, max: 100 },
        },
      },
    };

    writeFileSync(tmpFile, JSON.stringify(summary));

    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeUndefined();
    expect(result.source).toBe('k6');
    expect(result.metrics.p95_latency_ms).toBe(310.5);
    expect(result.metrics.p99_latency_ms).toBe(890);
    expect(result.metrics.avg_latency_ms).toBe(125.5);
    expect(result.metrics.error_rate).toBe(2.3);
    expect(result.metrics.throughput_rps).toBe(250.5);
    expect(result.metrics.total_requests).toBe(15000);
    expect(result.metrics.max_vus).toBe(100);
  });

  it('should return error when reportPath is missing', async () => {
    const result = await collector.collect({});

    expect(result.error).toBeDefined();
    expect(result.error).toContain('reportPath is required');
  });

  it('should return error for invalid format', async () => {
    writeFileSync(tmpFile, JSON.stringify({ no_metrics: true }));

    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid k6 summary format');
  });

  it('should handle missing optional metrics gracefully', async () => {
    const minimal = {
      metrics: {
        http_req_duration: {
          values: { avg: 100, min: 50, med: 90, max: 200, 'p(90)': 150, 'p(95)': 180, 'p(99)': 195 },
        },
      },
    };

    writeFileSync(tmpFile, JSON.stringify(minimal));

    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeUndefined();
    expect(result.metrics.p95_latency_ms).toBe(180);
    expect(result.metrics.error_rate).toBe(0);
    expect(result.metrics.total_requests).toBe(0);
    expect(result.metrics.max_vus).toBe(0);
  });
});
