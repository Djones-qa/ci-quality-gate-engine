import { readFile } from 'fs/promises';
import { JSONPath } from 'jsonpath-plus';
import { BaseCollector, CollectorConfig, CollectorResult } from './base.collector';

interface CustomMetricDefinition {
  name: string;
  jsonpath: string;
  type: 'number' | 'boolean' | 'string';
  default?: number | string | boolean;
}

interface CustomCollectorOptions {
  metrics: CustomMetricDefinition[];
}

export class CustomCollector extends BaseCollector {
  readonly name = 'custom';
  readonly supportedMetrics = ['*'];

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    try {
      if (!config.reportPath) {
        return this.buildError('reportPath is required for Custom collector');
      }

      const options = config.options as CustomCollectorOptions | undefined;
      if (!options?.metrics || !Array.isArray(options.metrics)) {
        return this.buildError('options.metrics array is required for Custom collector');
      }

      const raw = await readFile(config.reportPath, 'utf-8');
      const data = JSON.parse(raw);

      const metrics: Record<string, number | string | boolean> = {};

      for (const metricDef of options.metrics) {
        const result = JSONPath({ path: metricDef.jsonpath, json: data });
        const value = result.length > 0 ? result[0] : metricDef.default ?? 0;

        switch (metricDef.type) {
          case 'number':
            metrics[metricDef.name] = typeof value === 'number' ? value : Number(value) || 0;
            break;
          case 'boolean':
            metrics[metricDef.name] = Boolean(value);
            break;
          case 'string':
            metrics[metricDef.name] = String(value);
            break;
        }
      }

      return this.buildResult(metrics, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.buildError(`Failed to collect custom results: ${message}`);
    }
  }

  validate(data: unknown): boolean {
    return data !== null && data !== undefined;
  }
}
