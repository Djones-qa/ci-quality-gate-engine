import { readFile } from 'fs/promises';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface PactVerification {
  consumer: { name: string };
  provider: { name: string };
  success: boolean;
  interactions: Array<{
    description: string;
    success: boolean;
  }>;
}

interface PactReport {
  provider: { name: string };
  consumer: { name: string };
  interactions: Array<{
    description: string;
    providerState?: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface PactBrokerResult {
  summary: {
    successful: number;
    failed: number;
    interactions_count: number;
  };
  verificationResults?: PactVerification[];
}

export class PactCollector extends BaseCollector {
  readonly name = 'pact';
  readonly supportedMetrics = [
    'verification_pass_rate',
    'total_interactions',
    'passed_interactions',
    'failed_interactions',
    'breaking_changes',
    'consumers_verified',
  ];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for Pact collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data: PactBrokerResult = JSON.parse(raw);

      if (!this.validate(data)) {
        return this.buildError('Invalid Pact verification report format');
      }

      const { successful, failed, interactions_count } = data.summary;
      const total = successful + failed;
      const passRate = total > 0 ? (successful / total) * 100 : 0;
      const consumers = data.verificationResults?.length ?? 0;

      return this.buildResult(
        {
          verification_pass_rate: Math.round(passRate * 100) / 100,
          total_interactions: interactions_count,
          passed_interactions: successful,
          failed_interactions: failed,
          breaking_changes: failed,
          consumers_verified: consumers,
        },
        data,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect Pact results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const report = data as Record<string, unknown>;
    return report.summary !== undefined && typeof report.summary === 'object';
  }
}
