# CI Quality Gate Engine

[![CI Pipeline](https://github.com/Djones-qa/ci-quality-gate-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Djones-qa/ci-quality-gate-engine/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg)](https://redis.io/)
[![Jest](https://img.shields.io/badge/Jest-29-red.svg)](https://jestjs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Configurable CI/CD quality gate decision engine — aggregates test signals from unit, E2E, performance, security, accessibility, and contract tests to produce ship/no-ship verdicts with progressive delivery gates and automated rollback triggers.

## Features

- **Multi-Signal Aggregation** — Combines pass/fail/metrics from 8+ test sources into a single verdict
- **YAML Rule Definitions** — Declarative gate rules with thresholds, comparisons, and boolean logic
- **Weighted Scoring** — Assign importance weights to different signals (security > lint)
- **Progressive Delivery Gates** — Different thresholds per environment (canary → staging → production)
- **Plugin Collectors** — Adapters for Jest, Playwright, k6, OWASP ZAP, axe-core, Pact, Lighthouse
- **Historical Intelligence** — Gate decision trends, flaky gate detection, mean time to green
- **Notifications** — Slack, Microsoft Teams, PagerDuty escalation on failures
- **GitHub Action** — Drop-in custom action for any workflow
- **Rollback Triggers** — Auto-rollback on production gate failures

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       CI/CD Pipeline                              │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Triggers
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   CI Quality Gate Engine                          │
│                                                                  │
│  ┌────────┐ ┌──────────┐ ┌────┐ ┌─────────┐ ┌────────┐         │
│  │  Jest  │ │Playwright│ │ k6 │ │OWASP ZAP│ │axe-core│         │
│  └───┬────┘ └────┬─────┘ └─┬──┘ └────┬────┘ └───┬────┘         │
│      │            │         │         │          │               │
│  ┌───┴────┐ ┌────┴─────┐ ┌─┴──────┐                            │
│  │  Pact  │ │Lighthouse│ │ Custom │                             │
│  └───┬────┘ └────┬─────┘ └─┬──────┘                            │
│      └────────────┴─────────┴────────┐                          │
│                                      ▼                          │
│                        ┌──────────────────────┐                  │
│                        │    Rules Engine       │                  │
│                        │  (YAML-configured)    │                  │
│                        └──────────┬───────────┘                  │
│                                   ▼                              │
│                        ┌──────────────────────┐                  │
│                        │  Decision Aggregator │                  │
│                        │  PASS | WARN | FAIL  │                  │
│                        └──────────┬───────────┘                  │
│                                   │                              │
│              ┌────────────────────┼────────────────────┐         │
│              ▼                    ▼                    ▼         │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐     │
│  │  Slack/Teams   │  │   PostgreSQL    │  │  PagerDuty   │     │
│  │  Notification  │  │   (History)     │  │  Escalation  │     │
│  └────────────────┘  └─────────────────┘  └──────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ci-quality-gate-engine/
├── .github/workflows/
│   ├── ci.yml                        # CI pipeline (lint, unit, integration)
│   ├── release.yml                   # Semantic versioning + publish
│   └── example-consumer.yml          # Example: how to use in your pipeline
├── action.yml                        # Custom GitHub Action definition
├── src/
│   ├── collectors/
│   │   ├── base.collector.ts         # Abstract collector interface
│   │   ├── jest.collector.ts         # Jest/Vitest result parser
│   │   ├── playwright.collector.ts   # Playwright JSON report parser
│   │   ├── k6.collector.ts           # k6 summary JSON parser
│   │   ├── zap.collector.ts          # OWASP ZAP report parser
│   │   ├── axe.collector.ts          # axe-core result parser
│   │   ├── pact.collector.ts         # Pact broker verification parser
│   │   ├── lighthouse.collector.ts   # Lighthouse CI result parser
│   │   └── custom.collector.ts       # JSONPath-based custom extraction
│   ├── rules/
│   │   ├── parser.ts                 # YAML rule parser
│   │   ├── evaluator.ts             # Rule evaluation engine
│   │   ├── operators.ts             # Comparison operators
│   │   └── schema.ts                # Zod schema for rule validation
│   ├── engine/
│   │   ├── gate.engine.ts           # Core orchestration logic
│   │   ├── aggregator.ts            # Multi-signal aggregation + scoring
│   │   ├── decision.ts              # Pass/Warn/Fail/Rollback decision
│   │   └── progressive.ts           # Progressive delivery gate logic
│   ├── notifications/
│   │   ├── slack.notifier.ts        # Slack webhook integration
│   │   ├── teams.notifier.ts        # MS Teams webhook integration
│   │   ├── pagerduty.notifier.ts    # PagerDuty incident creation
│   │   └── github.notifier.ts       # GitHub commit status + PR comments
│   ├── api/
│   │   ├── server.ts                # Express API server
│   │   ├── routes/
│   │   │   ├── gates.routes.ts      # POST /gates/evaluate
│   │   │   ├── history.routes.ts    # GET /history, GET /history/trends
│   │   │   └── health.routes.ts     # GET /health, GET /ready
│   │   └── middleware/
│   │       ├── auth.middleware.ts    # API key authentication
│   │       └── error.middleware.ts   # Global error handler
│   ├── storage/
│   │   ├── postgres.client.ts       # PostgreSQL connection + queries
│   │   ├── redis.client.ts          # Redis connection + caching
│   │   └── migrations/
│   │       ├── 001_create_decisions.sql
│   │       ├── 002_create_metrics.sql
│   │       └── 003_create_trends.sql
│   ├── config/
│   │   ├── loader.ts                # YAML config loader + validator
│   │   └── defaults.ts              # Default thresholds
│   └── index.ts                     # CLI entry point
├── tests/
│   ├── unit/
│   │   ├── rules/
│   │   │   ├── parser.test.ts
│   │   │   └── evaluator.test.ts
│   │   ├── collectors/
│   │   │   ├── jest.collector.test.ts
│   │   │   ├── k6.collector.test.ts
│   │   │   └── zap.collector.test.ts
│   │   └── engine/
│   │       ├── aggregator.test.ts
│   │       └── decision.test.ts
│   ├── integration/
│   │   ├── api.test.ts
│   │   └── gate-flow.test.ts
│   └── fixtures/
│       ├── jest-results.json
│       ├── playwright-results.json
│       ├── k6-summary.json
│       ├── zap-report.json
│       └── axe-results.json
├── docs/
│   ├── architecture.md              # Architecture decisions
│   ├── collectors.md                # Custom collector guide
│   ├── rules-reference.md           # Rule syntax reference
│   └── progressive-delivery.md      # Progressive gate setup
├── gate-config.example.yml          # Example gate configuration
├── docker-compose.yml               # Full stack: engine + postgres + redis
├── Dockerfile                       # Multi-stage production build
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/Djones-qa/ci-quality-gate-engine.git
cd ci-quality-gate-engine

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Run database migrations
npm run migrate

# Start the engine
npm run dev
```

### Quick Start (Docker)

```bash
docker compose up -d
# Engine available at http://localhost:3000
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Format code
npm run format
```

## Collectors

| Collector | Source | Metrics Extracted |
|-----------|--------|-------------------|
| Jest | Unit/Integration | Coverage %, pass rate, test count, duration |
| Playwright | E2E | Pass rate, flaky test %, screenshot diffs |
| k6 | Performance | p95/p99 latency, error rate, throughput |
| OWASP ZAP | Security | Critical/High/Medium vulnerabilities |
| axe-core | Accessibility | Violations by impact level |
| Pact | Contract | Verification pass rate, breaking changes |
| Lighthouse | Web Vitals | LCP, FID, CLS, performance score |
| Custom | Any JSON | User-defined metric extraction via JSONPath |

## Gate Configuration

Gates are defined in YAML with environment-specific thresholds:

```yaml
version: "1.0"
name: "Production Deploy Gate"

environments:
  staging:
    strategy: "weighted-score"
    minimum_score: 80
    rules:
      - source: jest
        metric: coverage_percent
        operator: gte
        threshold: 80
        weight: 20
        severity: fail
      - source: playwright
        metric: pass_rate
        operator: gte
        threshold: 98
        weight: 25
        severity: fail
      - source: k6
        metric: p95_latency_ms
        operator: lte
        threshold: 300
        weight: 20
        severity: fail
      - source: zap
        metric: critical_vulnerabilities
        operator: eq
        threshold: 0
        weight: 25
        severity: fail
      - source: axe
        metric: critical_violations
        operator: eq
        threshold: 0
        weight: 10
        severity: fail

  production:
    strategy: "zero-tolerance"
    rollback_on_fail: true
    rules:
      - source: jest
        metric: coverage_percent
        operator: gte
        threshold: 85
        severity: fail
      - source: playwright
        metric: pass_rate
        operator: eq
        threshold: 100
        severity: fail
      - source: zap
        metric: critical_vulnerabilities
        operator: eq
        threshold: 0
        severity: fail
      - source: pact
        metric: breaking_changes
        operator: eq
        threshold: 0
        severity: fail

notifications:
  on_fail:
    - slack:
        channel: "#incidents"
    - pagerduty:
        severity: "critical"
```

## Decision Logic

| Verdict | Meaning |
|---------|---------|
| **PASS** ✅ | All rules satisfied, safe to deploy |
| **WARN** ⚠️ | Soft thresholds breached, requires manual approval |
| **FAIL** 🚫 | Hard thresholds breached, deployment blocked |
| **ROLLBACK** 🔴 | Production gate failure, auto-rollback triggered |

## GitHub Action Usage

```yaml
- name: Quality Gate Check
  uses: Djones-qa/ci-quality-gate-engine@v1
  with:
    config: gate-config.yml
    environment: production
    jest-report: ./coverage/report.json
    playwright-report: ./e2e/results.json
    k6-report: ./perf/summary.json
    zap-report: ./security/zap-report.json
    axe-report: ./a11y/axe-results.json
    slack-webhook: ${{ secrets.SLACK_WEBHOOK }}

- name: Deploy
  if: steps.quality-gate.outputs.verdict == 'pass'
  run: npm run deploy
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gates/evaluate` | Evaluate a gate with test results |
| GET | `/api/gates/:id` | Get a specific gate decision |
| GET | `/api/history` | List historical gate decisions |
| GET | `/api/history/trends` | Gate pass/fail trends over time |
| GET | `/api/history/flaky` | Detect flaky gates |
| GET | `/api/health` | Health check |
| GET | `/api/ready` | Readiness probe |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and update values:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/gates` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `API_KEY` | API authentication key | — |
| `SLACK_WEBHOOK_URL` | Slack notification webhook | — |
| `PAGERDUTY_ROUTING_KEY` | PagerDuty integration key | — |
| `GITHUB_TOKEN` | GitHub API token for PR comments | — |

## CI/CD Pipeline

The GitHub Actions workflow runs on push to `main`/`develop` and pull requests:

1. **Lint & Type Check** — ESLint + TypeScript compiler
2. **Unit Tests** — Jest with coverage reporting
3. **Integration Tests** — API and gate flow validation
4. **Docker Build** — Multi-stage production image verification

## Author

**Darrius Jones**

- GitHub: [@Djones-qa](https://github.com/Djones-qa)
- LinkedIn: [darrius-jones-28226b350](https://www.linkedin.com/in/darrius-jones-28226b350)

## License

MIT © 2026 Darrius Jones

See [LICENSE](./LICENSE) for details.
