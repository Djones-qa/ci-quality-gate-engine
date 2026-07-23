import axios from 'axios';
import { GateDecision } from '../engine/decision';
import { logger } from '../config/logger';

interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  payload: {
    summary: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    component: string;
    custom_details: Record<string, unknown>;
  };
}

const PAGERDUTY_EVENTS_URL = 'https://events.pagerduty.com/v2/enqueue';

/**
 * Send gate failure alert to PagerDuty.
 */
export async function notifyPagerDuty(
  routingKey: string,
  decision: GateDecision,
  severity?: string,
): Promise<void> {
  const pdSeverity = mapSeverity(severity || decision.verdict);

  const event: PagerDutyEvent = {
    routing_key: routingKey,
    event_action: 'trigger',
    payload: {
      summary: `Quality Gate ${decision.verdict.toUpperCase()} — Build ${decision.buildId} in ${decision.environment}`,
      severity: pdSeverity,
      source: 'ci-quality-gate-engine',
      component: decision.environment,
      custom_details: {
        build_id: decision.buildId,
        environment: decision.environment,
        verdict: decision.verdict,
        score: decision.score,
        strategy: decision.strategy,
        total_rules: decision.summary.total_rules,
        passed_rules: decision.summary.passed_rules,
        failed_rules: decision.summary.failed_rules,
        triggers_rollback: decision.triggersRollback,
        timestamp: decision.timestamp.toISOString(),
      },
    },
  };

  try {
    await axios.post(PAGERDUTY_EVENTS_URL, event);
    logger.info(`PagerDuty alert sent for build ${decision.buildId} (severity: ${pdSeverity})`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to send PagerDuty alert: ${msg}`);
    throw new Error(`PagerDuty notification failed: ${msg}`);
  }
}

function mapSeverity(verdict: string): 'critical' | 'error' | 'warning' | 'info' {
  switch (verdict) {
    case 'rollback':
    case 'critical':
      return 'critical';
    case 'fail':
    case 'error':
      return 'error';
    case 'warn':
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}
