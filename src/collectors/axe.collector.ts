import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: Array<{ html: string; target: string[] }>;
}

interface AxeResult {
  violations: AxeViolation[];
  passes: Array<{ id: string }>;
  incomplete: Array<{ id: string }>;
  inapplicable: Array<{ id: string }>;
  url?: string;
  timestamp?: string;
}

export class AxeCollector extends BaseCollector {
  readonly name = 'axe';
  readonly supportedMetrics = [
    'critical_violations',
    'serious_violations',
    'moderate_violations',
    'minor_violations',
    'total_violations',
    'total_passes',
    'compliance_rate',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for axe collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: AxeResult | AxeResult[] = JSON.parse(raw);

      // axe can output a single result or an array of page results
      const results = Array.isArray(data) ? data : [data];

      if (!this.validate(results[0])) {
        return this.buildError('Invalid axe-core report format');
      }

      const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
      let totalPasses = 0;

      for (const result of results) {
        for (const violation of result.violations) {
          const nodeCount = violation.nodes.length;
          switch (violation.impact) {
            case 'critical':
              counts.critical += nodeCount;
              break;
            case 'serious':
              counts.serious += nodeCount;
              break;
            case 'moderate':
              counts.moderate += nodeCount;
              break;
            case 'minor':
              counts.minor += nodeCount;
              break;
          }
        }
        totalPasses += result.passes.length;
      }

      const totalViolations = counts.critical + counts.serious + counts.moderate + counts.minor;
      const totalRules = totalViolations + totalPasses;
      const complianceRate = totalRules > 0 ? (totalPasses / totalRules) * 100 : 100;

      return this.buildResult(
        {
          critical_violations: counts.critical,
          serious_violations: counts.serious,
          moderate_violations: counts.moderate,
          minor_violations: counts.minor,
          total_violations: totalViolations,
          total_passes: totalPasses,
          compliance_rate: Math.round(complianceRate * 100) / 100,
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect axe results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const result = data as Record<string, unknown>;
    return Array.isArray(result.violations) && Array.isArray(result.passes);
  }
}
