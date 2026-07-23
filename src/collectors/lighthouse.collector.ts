import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface LighthouseAudit {
  id: string;
  score: number | null;
  numericValue?: number;
}

interface LighthouseReport {
  categories: {
    performance?: { score: number };
    accessibility?: { score: number };
    'best-practices'?: { score: number };
    seo?: { score: number };
  };
  audits: Record<string, LighthouseAudit>;
}

export class LighthouseCollector extends BaseCollector {
  readonly name = 'lighthouse';
  readonly supportedMetrics = [
    'performance_score',
    'accessibility_score',
    'best_practices_score',
    'seo_score',
    'lcp_ms',
    'fid_ms',
    'cls',
    'ttfb_ms',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for Lighthouse collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: LighthouseReport = JSON.parse(raw);

      if (!this.validate(data)) {
        return this.buildError('Invalid Lighthouse report format');
      }

      const categories = data.categories;
      const audits = data.audits;

      return this.buildResult(
        {
          performance_score: Math.round((categories.performance?.score ?? 0) * 100),
          accessibility_score: Math.round((categories.accessibility?.score ?? 0) * 100),
          best_practices_score: Math.round((categories['best-practices']?.score ?? 0) * 100),
          seo_score: Math.round((categories.seo?.score ?? 0) * 100),
          lcp_ms: Math.round(audits['largest-contentful-paint']?.numericValue ?? 0),
          fid_ms: Math.round(audits['max-potential-fid']?.numericValue ?? 0),
          cls: Math.round((audits['cumulative-layout-shift']?.numericValue ?? 0) * 1000) / 1000,
          ttfb_ms: Math.round(audits['server-response-time']?.numericValue ?? 0),
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect Lighthouse results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const report = data as Record<string, unknown>;
    return report.categories !== undefined && report.audits !== undefined;
  }
}
