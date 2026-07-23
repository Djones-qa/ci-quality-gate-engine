import axios from 'axios';
import { GateDecision } from '../engine/decision';
import { logger } from '../config/logger';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
}

/**
 * Send gate decision notification to Slack via webhook.
 */
export async function notifySlack(
  webhookUrl: string,
  decision: GateDecision,
  channel?: string,
  customMessage?: string,
): Promise<void> {
  const verdictEmoji = getVerdictEmoji(decision.verdict);
  const color = getVerdictColor(decision.verdict);

  const message = customMessage || buildDefaultMessage(decision);

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${verdictEmoji} Quality Gate: ${decision.verdict.toUpperCase()}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Build:*\n${decision.buildId}` },
        { type: 'mrkdwn', text: `*Environment:*\n${decision.environment}` },
        { type: 'mrkdwn', text: `*Score:*\n${decision.score}/100` },
        { type: 'mrkdwn', text: `*Strategy:*\n${decision.strategy}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:* ${decision.summary.passed_rules}/${decision.summary.total_rules} rules passed | ${decision.summary.failed_rules} failed | ${decision.summary.warned_rules} warnings`,
      },
    },
  ];

  if (decision.requiresApproval) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '⚠️ *Manual approval required before deployment.*' },
    });
  }

  if (decision.triggersRollback) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '🔴 *Automatic rollback has been triggered.*' },
    });
  }

  try {
    await axios.post(webhookUrl, {
      channel,
      text: message,
      blocks,
    });
    logger.info(`Slack notification sent for build ${decision.buildId}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to send Slack notification: ${msg}`);
    throw new Error(`Slack notification failed: ${msg}`);
  }
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case 'pass':
      return '✅';
    case 'warn':
      return '⚠️';
    case 'fail':
      return '🚫';
    case 'rollback':
      return '🔴';
    default:
      return '❓';
  }
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'pass':
      return '#36a64f';
    case 'warn':
      return '#daa038';
    case 'fail':
      return '#cc0000';
    case 'rollback':
      return '#8b0000';
    default:
      return '#808080';
  }
}

function buildDefaultMessage(decision: GateDecision): string {
  const emoji = getVerdictEmoji(decision.verdict);
  return `${emoji} Quality Gate ${decision.verdict.toUpperCase()} for ${decision.buildId} in ${decision.environment} (score: ${decision.score})`;
}
