/**
 * Base collector interface and types for all test signal collectors.
 * Each collector adapter extends this to parse results from a specific tool.
 */

export interface CollectorConfig {
  reportPath?: string;
  reportUrl?: string;
  options?: Record<string, unknown>;
}

export interface CollectorMetrics {
  [key: string]: number | string | boolean;
}

export interface CollectorResult {
  source: string;
  metrics: CollectorMetrics;
  raw: unknown;
  collectedAt: Date;
  duration?: number;
  error?: string;
}

export abstract class BaseCollector {
  abstract readonly name: string;
  abstract readonly supportedMetrics: string[];

  /**
   * Collect metrics from the test tool's report output.
   */
  abstract collect(config: CollectorConfig): Promise<CollectorResult>;

  /**
   * Validate that the report data is in the expected format.
   */
  abstract validate(data: unknown): boolean;

  /**
   * Build a standardized result object.
   */
  protected buildResult(metrics: CollectorMetrics, raw: unknown): CollectorResult {
    return {
      source: this.name,
      metrics,
      raw,
      collectedAt: new Date(),
    };
  }

  /**
   * Build an error result when collection fails.
   */
  protected buildError(error: string): CollectorResult {
    return {
      source: this.name,
      metrics: {},
      raw: null,
      collectedAt: new Date(),
      error,
    };
  }
}
