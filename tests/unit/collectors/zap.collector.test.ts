import { ZapCollector } from '../../../src/collectors/zap.collector';
import { writeFileSync, mkdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

describe('ZapCollector', () => {
  const collector = new ZapCollector();
  const tmpDir = join(__dirname, '../../fixtures/tmp');
  const tmpFile = join(tmpDir, 'zap-test.json');

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    try {
      unlinkSync(tmpFile);
      rmdirSync(tmpDir);
    } catch { /* ignore */ }
  });

  it('should have correct name', () => {
    expect(collector.name).toBe('zap');
  });

  it('should collect metrics from a valid ZAP report', async () => {
    const report = {
      site: [{
        alerts: [
          { riskcode: '3', confidence: '2', name: 'XSS', count: '3', riskdesc: 'High' },
          { riskcode: '2', confidence: '2', name: 'CSRF', count: '1', riskdesc: 'Medium' },
          { riskcode: '1', confidence: '1', name: 'Info', count: '2', riskdesc: 'Low' },
        ],
      }],
    };

    writeFileSync(tmpFile, JSON.stringify(report));
    const result = await collector.collect({ reportPath: tmpFile });

    expect(result.error).toBeUndefined();
    expect(result.metrics.critical_vulnerabilities).toBe(0);
    expect(result.metrics.high_vulnerabilities).toBe(3);
    expect(result.metrics.medium_vulnerabilities).toBe(1);
    expect(result.metrics.low_vulnerabilities).toBe(2);
    expect(result.metrics.total_alerts).toBe(3);
  });

  it('should return error when reportPath is missing', async () => {
    const result = await collector.collect({});
    expect(result.error).toContain('reportPath is required');
  });
});
