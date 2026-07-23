import { Operator } from './schema';

/**
 * Evaluate a comparison between a metric value and a threshold.
 */
export function evaluateOperator(
  operator: Operator,
  value: number,
  threshold: number | number[],
): boolean {
  switch (operator) {
    case 'eq':
      return value === threshold;

    case 'neq':
      return value !== threshold;

    case 'gt':
      if (typeof threshold !== 'number') {
        throw new Error('gt operator requires a single number threshold');
      }
      return value > threshold;

    case 'gte':
      if (typeof threshold !== 'number') {
        throw new Error('gte operator requires a single number threshold');
      }
      return value >= threshold;

    case 'lt':
      if (typeof threshold !== 'number') {
        throw new Error('lt operator requires a single number threshold');
      }
      return value < threshold;

    case 'lte':
      if (typeof threshold !== 'number') {
        throw new Error('lte operator requires a single number threshold');
      }
      return value <= threshold;

    case 'between':
      if (!Array.isArray(threshold) || threshold.length !== 2) {
        throw new Error('between operator requires a [min, max] threshold array');
      }
      return value >= threshold[0] && value <= threshold[1];

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
