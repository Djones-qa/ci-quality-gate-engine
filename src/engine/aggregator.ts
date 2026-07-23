import { BaseCollector, CollectorConfig, CollectorResult } from '../collectors/base.collector';
import { JestCollector } from '../collectors/jest.collector';
import { PlaywrightCollector } from '../collectors/playwright.collector';
import { K6Collector } from '../collectors/k6.collector';
import { ZapCollector } from '../collectors/zap.collector';
import { AxeCollector } from '../collectors/axe.collector';
import { PactCollector } from '../collectors/pact.collector';
import { LighthouseCollector } from '../collectors/lighthouse.collector';
import { CustomCollector } from '../collectors/custom.collector';
import { logger } from '../config/logger';

export interface AggregatorInput {
  [source: string]: CollectorConfig;
}

/**
 * Registry of all available collectors.
 */
const collectorRegistry: Record<string, BaseCollector> = {
  jest: new JestCollector(),
  playwright: new PlaywrightCollector(),
  k6: new K6Collector(),
  zap: new ZapCollector(),
  axe: new AxeCollector(),
  pact: new PactCollector(),
  lighthouse: new LighthouseCollector(),
  custom: new CustomCollector(),
};

/**
 * Collect results from all configured sources in parallel.
 */
export async function aggregateResults(
  inputs: AggregatorInput,
): Promise<Map<string, CollectorResult>> {
  const results = new Map<string, CollectorResult>();
  const sources = Object.entries(inputs);

  logger.info(`Collecting results from ${sources.length} sources: ${sources.map(([s]) => s).join(', ')}`);

  const promises = sources.map(async ([source, config]) => {
    const collector = collectorRegistry[source];

    if (!collector) {
      logger.warn(`No collector found for source: ${source}`);
      results.set(source, {
        source,
        metrics: {},
        raw: null,
        collectedAt: new Date(),
        error: `Unknown collector: ${source}`,
      });
      return;
    }

    try {
      const result = await collector.collect(config);
      results.set(source, result);

      if (result.error) {
        logger.warn(`Collector ${source} returned error: ${result.error}`);
      } else {
        logger.info(`Collected ${Object.keys(result.metrics).length} metrics from ${source}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Collector ${source} threw: ${message}`);
      results.set(source, {
        source,
        metrics: {},
        raw: null,
        collectedAt: new Date(),
        error: message,
      });
    }
  });

  await Promise.all(promises);

  return results;
}

/**
 * Get list of registered collector names.
 */
export function getAvailableCollectors(): string[] {
  return Object.keys(collectorRegistry);
}

/**
 * Register a custom collector at runtime.
 */
export function registerCollector(name: string, collector: BaseCollector): void {
  collectorRegistry[name] = collector;
  logger.info(`Registered custom collector: ${name}`);
}
