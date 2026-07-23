import axios from 'axios';
import { GateDecision } from '../engine/decision';
import { logger } from '../config/logger';

const GITHUB_API = 'https://api.github.com';

/**
 * Set commit status on GitHub (success/failure/pending).
 */
export async function setCommitStatus(
  token: string,
  repository: string,
  sha: string,
  decision: GateDecision,
): Promise<void> {
  const state = mapVerdictToState(decision.verdict);
  const description = `Gate ${decision.verdict}: ${decision.summary.passed_rules}/${decision.summary.total_rules} rules passed (score: ${decision.score})`;

  try {
    await axios.post(
      `${GITHUB_API}/repos/${repository}/statuses/${sha}`,
      {
        state,
        description: description.substring(0, 140),
        context: `quality-gate/${decision.environment}`,
        target_url: undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );
    logger.info(`GitHub commit status set for ${sha.substring(0, 7)}: ${state}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to set GitHub commit status: ${msg}`);
    throw new Error(`GitHub status update failed: ${msg}`);
  }
}

/**
 * Post a PR comment with gate results.
 */
export async function postPRComment(
  token: string,
  repository: string,
  prNumber: number,
  decision: GateDecision,
): Promise<void> {
  const emoji = getVerdictEmoji(decision.verdict);
  const body = buildCommentBody(decision, emoji);

  try {
    await axios.post(
      `${GITHUB_API}/repos/${repository}/issues/${prNumber}/comments`,
      { body },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );
    logger.info(`GitHub PR comment posted on #${prNumber}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to post GitHub PR comment: ${msg}`);
    throw new Error(`GitHub PR comment failed: ${msg}`);
  }
}

function mapVerdictToState(verdict: string): 'success' | 'failure' | 'pending' {
  switch (verdict) {
    case 'pass':
      return 'success';
    case 'warn':
      return 'pending';
    default:
      return 'failure';
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

function buildCommentBody(decision: GateDecision, emoji: string): string {
  const lines = [
    `## ${emoji} Quality Gate: ${decision.verdict.toUpperCase()}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Environment | ${decision.environment} |`,
    `| Strategy | ${decision.strategy} |`,
    `| Score | ${decision.score}/100 |`,
    `| Rules Passed | ${decision.summary.passed_rules}/${decision.summary.total_rules} |`,
    `| Failed | ${decision.summary.failed_rules} |`,
    `| Warnings | ${decision.summary.warned_rules} |`,
    '',
  ];

  if (decision.results.length > 0) {
    lines.push('### Rule Details', '');
    lines.push('| Source | Metric | Result |');
    lines.push('|--------|--------|--------|');

    for (const result of decision.results) {
      const icon = result.passed ? '✅' : '❌';
      lines.push(`| ${result.rule.source} | ${result.rule.metric} | ${icon} ${result.actualValue} |`);
    }
  }

  if (decision.requiresApproval) {
    lines.push('', '> ⚠️ **Manual approval required** before deployment can proceed.');
  }

  if (decision.triggersRollback) {
    lines.push('', '> 🔴 **Automatic rollback triggered.**');
  }

  return lines.join('\n');
}
