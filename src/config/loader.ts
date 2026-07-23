import * as dotenv from 'dotenv';
import { DEFAULT_PORT } from './defaults';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  auth: {
    apiKey: string;
  };
  notifications: {
    slackWebhookUrl?: string;
    teamsWebhookUrl?: string;
    pagerdutyRoutingKey?: string;
  };
  github: {
    token?: string;
    repository?: string;
  };
}

/**
 * Load application configuration from environment variables.
 */
export function loadAppConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/quality_gates',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    auth: {
      apiKey: process.env.API_KEY || '',
    },
    notifications: {
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
      pagerdutyRoutingKey: process.env.PAGERDUTY_ROUTING_KEY,
    },
    github: {
      token: process.env.GITHUB_TOKEN,
      repository: process.env.GITHUB_REPOSITORY,
    },
  };
}
