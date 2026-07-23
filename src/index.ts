#!/usr/bin/env node

import { startServer } from './api/server';
import { parseGateConfig } from './rules/parser';
import { GateEngine } from './engine/gate.engine';
import { ProgressiveGate } from './engine/progressive';
import { logger } from './config/logger';

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case 'serve':
    case 'server':
      startServer();
      break;

    case 'evaluate': {
      const configPath = getArg(args, '--config') || 'gate-config.yml';
      const environment = getArg(args, '--environment') || getArg(args, '--env');
      const buildId = getArg(args, '--build-id') || `build-${Date.now()}`;

      if (!environment) {
        logger.error('--environment is required for evaluate command');
        process.exit(1);
      }

      const sources = parseSourceArgs(args);
      const config = await parseGateConfig(configPath);
      const engine = new GateEngine(config);

      const response = await engine.evaluate({ buildId, environment, sources });

      // Print formatted verdict
      console.log('\n┌─────────────────────────────────────────────┐');
      console.log(`│  GATE VERDICT: ${response.decision.verdict.toUpperCase().padEnd(10)} ${getVerdictIcon(response.decision.verdict)}                    │`);
      console.log('├─────────────────────────────────────────────┤');

      for (const result of response.decision.results) {
        const icon = result.passed ? '✅' : '❌';
        const line = `│  ${icon} ${result.rule.source}.${result.rule.metric}: ${result.actualValue}`;
        console.log(line.padEnd(46) + '│');
      }

      console.log(`│  Score: ${response.decision.score}/100`.padEnd(46) + '│');
      console.log('└─────────────────────────────────────────────┘\n');

      process.exit(response.decision.verdict === 'pass' ? 0 : 1);
      break;
    }

    case 'progressive': {
      const configPath = getArg(args, '--config') || 'gate-config.yml';
      const buildId = getArg(args, '--build-id') || `build-${Date.now()}`;
      const pipeline = (getArg(args, '--pipeline') || 'canary,staging,production').split(',');

      const sources = parseSourceArgs(args);
      const config = await parseGateConfig(configPath);
      const engine = new GateEngine(config);
      const progressive = new ProgressiveGate(engine, pipeline);

      const result = await progressive.run(buildId, sources);

      console.log(`\nProgressive Gate: ${result.finalVerdict.toUpperCase()}`);
      console.log(`Completed: ${result.completedStages}/${result.totalStages} stages`);

      for (const stage of result.stages) {
        const icon = stage.passed ? '✅' : '❌';
        console.log(`  ${icon} ${stage.environment}: ${stage.decision.verdict}`);
      }

      process.exit(result.finalVerdict === 'pass' ? 0 : 1);
      break;
    }

    default:
      console.log(`
CI Quality Gate Engine v1.0.0

Usage:
  ci-quality-gate serve                     Start the API server
  ci-quality-gate evaluate [options]        Evaluate a single gate
  ci-quality-gate progressive [options]     Run progressive delivery gates

Options:
  --config <path>           Path to gate-config.yml (default: gate-config.yml)
  --environment <env>       Target environment (required for evaluate)
  --build-id <id>           Build identifier
  --pipeline <envs>         Comma-separated environments (for progressive)
  --jest-report <path>      Path to Jest JSON report
  --playwright-report <p>   Path to Playwright JSON report
  --k6-report <path>        Path to k6 summary JSON
  --zap-report <path>       Path to OWASP ZAP report
  --axe-report <path>       Path to axe-core results JSON
  --pact-report <path>      Path to Pact verification report
  --lighthouse-report <p>   Path to Lighthouse report JSON

Examples:
  ci-quality-gate evaluate --config gate-config.yml --environment staging \\
    --jest-report ./coverage/report.json --k6-report ./perf/summary.json
      `);
      break;
  }
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

function parseSourceArgs(args: string[]): Record<string, { reportPath: string }> {
  const sources: Record<string, { reportPath: string }> = {};
  const sourceFlags: Record<string, string> = {
    '--jest-report': 'jest',
    '--playwright-report': 'playwright',
    '--k6-report': 'k6',
    '--zap-report': 'zap',
    '--axe-report': 'axe',
    '--pact-report': 'pact',
    '--lighthouse-report': 'lighthouse',
  };

  for (const [flag, source] of Object.entries(sourceFlags)) {
    const path = getArg(args, flag);
    if (path) {
      sources[source] = { reportPath: path };
    }
  }

  return sources;
}

function getVerdictIcon(verdict: string): string {
  switch (verdict) {
    case 'pass': return '✅';
    case 'warn': return '⚠️';
    case 'fail': return '🚫';
    case 'rollback': return '🔴';
    default: return '❓';
  }
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
