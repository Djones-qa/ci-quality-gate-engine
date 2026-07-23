import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface ZapAlert {
  riskcode: string;
  confidence: string;
  name: string;
  count: string;
  riskdesc: string;
}

interface ZapSite {
  alerts: ZapAlert[];
}

interface ZapReport {
  site: ZapSite[];
}

export class ZapCollector extends BaseCollector {
  readonly name = 'zap';
  readonly supportedMetrics = [
    'critical_vulnerabilities',
    'high_vulnerabilities',
    'medium_vulnerabilities',
    'low_vulnerabilities',
    'informational',
    'total_alerts',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for ZAP collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: ZapReport = JSON.parse(raw);

      if (!this.validate(data)) {
        return this.buildError('Invalid OWASP ZAP report format');
      }

      const alerts = data.site.flatMap((site) => site.alerts);

      const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };

      for (const alert of alerts) {
        const riskCode = parseInt(alert.riskcode, 10);
        switch (riskCode) {
          case 4:
            counts.critical += parseInt(alert.count, 10) || 1;
            break;
          case 3:
            counts.high += parseInt(alert.count, 10) || 1;
            break;
          case 2:
            counts.medium += parseInt(alert.count, 10) || 1;
            break;
          case 1:
            counts.low += parseInt(alert.count, 10) || 1;
            break;
          case 0:
            counts.informational += parseInt(alert.count, 10) || 1;
            break;
        }
      }

      return this.buildResult(
        {
          critical_vulnerabilities: counts.critical,
          high_vulnerabilities: counts.high,
          medium_vulnerabilities: counts.medium,
          low_vulnerabilities: counts.low,
          informational: counts.informational,
          total_alerts: alerts.length,
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect ZAP results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const report = data as Record<string, unknown>;
    return Array.isArray(report.site);
  }
}
