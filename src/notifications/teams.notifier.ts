import axios from 'axios';
import { GateDecision } from '../engine/decision';
import { logger } from '../config/logger';

/**
 * Send gate decision notification to Microsoft Teams via webhook.
 */
export async function notifyTeams(
  webhookUrl: string,
  decision: GateDecision,
  _customMessage?: string,
): Promise<void> {
  const verdictEmoji = getVerdictEmoji(decision.verdict);
  const color = getVerdictColor(decision.verdict);

  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: color,
    summary: `Quality Gate ${decision.verdict.toUpperCase()} for ${decision.buildId}`,
    sections: [
      {
        activityTitle: `${verdictEmoji} Quality Gate: ${decision.verdict.toUpperCase()}`,
        facts: [
          { name: 'Build', value: decision.buildId },
          { name: 'Environment', value: decision.environment },
          { name: 'Score', value: `${decision.score}/100` },
          { name: 'Strategy', value: decision.strategy },
          {
            name: 'Rules',
            value: `${decision.summary.passed_rules}/${decision.summary.total_rules} passed`,
          },
        ],
        markdown: true,
      },
    ],
  };

  if (decision.requiresApproval) {
    card.sections.push({
      activityTitle: '⚠️ Manual approval required before deployment.',
      facts: [],
      markdown: true,
    });
  }

  try {
    await axios.post(webhookUrl, card);
    logger.info(`Teams notification sent for build ${decision.buildId}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to send Teams notification: ${msg}`);
    throw new Error(`Teams notification failed: ${msg}`);
  }
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case 'pass': return '✅';
    case 'warn': return '⚠️';
    case 'fail': return '🚫';
    case 'rollback': return '🔴';
    default: return '❓';
  }
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'pass': return '36a64f';
    case 'warn': return 'daa038';
    case 'fail': return 'cc0000';
    case 'rollback': return '8b0000';
    default: return '808080';
  }
}
