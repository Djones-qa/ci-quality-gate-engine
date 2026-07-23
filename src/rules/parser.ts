import * as yaml from 'js-yaml';
import { readFile } from 'fs/promises';
import { GateConfig, GateConfigSchema } from './schema';
import { logger } from '../config/logger';

/**
 * Parse and validate a YAML gate configuration file.
 */
export async function parseGateConfig(configPath: string): Promise<GateConfig> {
  try {
    const content = await readFile(configPath, 'utf-8');
    const rawConfig = yaml.load(content);

    const result = GateConfigSchema.safeParse(rawConfig);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`Invalid gate configuration:\n${errors.join('\n')}`);
    }

    logger.info(`Parsed gate config: ${result.data.name} (v${result.data.version})`);
    logger.info(`Environments: ${Object.keys(result.data.environments).join(', ')}`);

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid gate')) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse gate config at ${configPath}: ${message}`);
  }
}

/**
 * Parse gate config from a YAML string (useful for testing).
 */
export function parseGateConfigFromString(yamlContent: string): GateConfig {
  const rawConfig = yaml.load(yamlContent);
  const result = GateConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid gate configuration:\n${errors.join('\n')}`);
  }

  return result.data;
}
