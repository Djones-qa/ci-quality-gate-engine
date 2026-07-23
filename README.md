# CI Quality Gate Engine

A configurable, plugin-based CI/CD quality gate decision engine that aggregates test signals from multiple sources — unit, E2E, performance, security, accessibility, and contract tests — and produces a ship/no-ship verdict with detailed reporting, historical trends, and automated rollback triggers.

---

## Table of Contents

- [About](#about)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Gate Configuration](#gate-configuration)
- [Collectors](#collectors)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [GitHub Action](#github-action)
- [Author](#author)
- [License](#license)
- [Tags](#tags)

---

## About

Most QA engineers write tests. This project builds the **system that decides whether those tests mean your code can ship.**

The CI Quality Gate Engine sits at the end of your CI/CD pipeline and answers one question: **"Is this build safe to deploy?"** It does this by:

1. Collecting results from every test discipline (unit, E2E, perf, security, a11y, contracts)
2. Evaluating them against configurable threshold rules
3. Producing a pass/fail/warn verdict with detailed reasoning
4. Enforcing progressive delivery gates (canary → staging → production)
5. Triggering rollbacks or escalations when production gates fail

This mirrors how quality gates operate at scale companies like Amazon, Netflix, Stripe, and Shopify — where a single flaky gate can block thousands of deployments or let a critical bug slip through.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                                │
│  (GitHub Actions / Jenkins / GitLab CI / CircleCI)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Triggers
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CI Quality Gate Engine                            │
│                                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │   Jest    │  │Playwright │  │    k6     │  │ OWASP ZAP │       │
│  │ Collector │  │ Collector │  │ Collector │  │ Collector │       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
│        │               │               │               │            │
│  ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐      │
│  │  axe-core │  │   Pact    │  │ Lighthouse │  │  Custom   │      │
│  │ Collector │  │ Collector │  │ Collector │  │ Collector │      │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘      │
│        │               │               │               │            │
│        └───────────────┴───────┬───────┴───────────────┘            │
│                                │                                    │
│                    ┌───────────▼───────────┐                        │
│                    │    Rules Engine       │                        │
│                    │  (YAML-configured)    │                        │
│                    └───────────┬───────────┘                        │
│                                │                                    │
│                    ┌───────────▼───────────┐                        │
│                    │  Decision Aggregator  │                        │
│                    │  PASS | WARN | FAIL   │                        │
│                    └───────────┬───────────┘                        │
│                                │                                    │
│              ┌─────────────────┼─────────────────┐                  │
│              ▼                 ▼                  ▼                  │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────┐          │
│  │  Slack/Teams  │  │   PostgreSQL    │  │  PagerDuty   │          │
│  │ Notification  │  │   (History)     │  │  Escalation  │          │
│  └───────────────┘  └─────────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Engine
- **Multi-signal aggregation** — Combines pass/fail/metrics from 8+ test sources into a single verdict
- **YAML rule definitions** — Declarative gate rules with support for thresholds, comparisons, and boolean logic
- **Weighted scoring** — Assign importance weights to different signals (security > lint)
- **Progressive delivery gates** — Different thresholds per environment (canary → staging → production)

### Collectors (Plugin Architecture)
| Collector | Source | Metrics Extracted |
|-----------|--------|-------------------|
| Jest | Unit/Integration | Coverage %, pass rate, test count, duration |
| Playwright | E2E | Pass rate, flaky test %, screenshot diffs |
| k6 | Performance | p95/p99 latency, error rate, throughput, SLO breaches |
| OWASP ZAP | Security | Critical/High/Medium vulns, new vs. baseline |
| axe-core | Accessibility | Violations by impact (critical/serious/moderate) |
| Pact | Contract | Verification pass rate, breaking changes detected |
| Lighthouse | Web Vitals | LCP, FID, CLS, performance score |
| Custom | Any JSON | User-defined metric extraction via JSONPath |

### Decision Logic
- **PASS** — All rules satisfied, safe to deploy
- **WARN** — Soft thresholds breached, deploy with caution (requires manual approval)
- **FAIL** — Hard thresholds breached, deployment blocked
- **ROLLBACK** — Production gate failure triggers automatic rollback

### Notifications & Integrations
- Slack / Microsoft Teams webhook alerts with rich formatting
- PagerDuty escalation on production gate failures
- GitHub commit status and PR check annotations
- Webhook-based extensibility for custom integrations

### Historical Intelligence
- Gate decision history with trend analysis
- Flaky gate detection (gates that flip pass/fail without code changes)
- Mean time to green (MTTG) tracking
- Regression detection across deployments

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js 20+ |
| Database | PostgreSQL 15 (decision history, trends) |
| Cache | Redis 7 (pipeline state, real-time locks) |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions (reusable workflows + custom action) |
| Testing | Jest (unit), Supertest (integration) |
| Validation | Zod (runtime schema validation) |
| Config | YAML (gate rules), dotenv (environment) |

---

## Project Structure

```
ci-quality-gate-engine/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI for the engine itself
│   │   ├── release.yml               # Semantic versioning + publish
│   │   └── example-consumer.yml      # Example: how to use this in your pipeline
│   └── CODEOWNERS
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
│   │   ├── operators.ts             # Comparison operators (gt, lt, eq, between)
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
│   │   │   ├── gates.routes.ts      # GET /gates, POST /gates/evaluate
│   │   │   ├── history.routes.ts    # GET /history, GET /history/:id
│   │   │   └── health.routes.ts     # GET /health, GET /ready
│   │   └── middleware/
│   │       ├── auth.middleware.ts    # API key authentication
│   │       └── error.middleware.ts   # Global error handler
│   ├── storage/
│   │   ├── postgres.client.ts       # PostgreSQL connection + queries
│   │   ├── redis.client.ts          # Redis connection + caching
│   │   └── migrations/              # Database schema migrations
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
│   ├── architecture.md              # Detailed architecture decisions
│   ├── collectors.md                # How to build custom collectors
│   ├── rules-reference.md           # Complete rule syntax reference
│   └── progressive-delivery.md      # Progressive gate setup guide
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

---

## Gate Configuration

Gates are defined in YAML. Here's a real-world example:

```yaml
# gate-config.yml
version: "1.0"
name: "Production Deploy Gate"

environments:
  canary:
    strategy: "any-fail-blocks"
    rules:
      - source: jest
        metric: coverage_percent
        operator: gte
        threshold: 75
        severity: fail
      - source: k6
        metric: p95_latency_ms
        operator: lte
        threshold: 500
        severity: warn

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
    requires_approval_on_warn: true
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
      - source: k6
        metric: p95_latency_ms
        operator: lte
        threshold: 200
        severity: fail
        comparison: baseline
        regression_threshold: 10%
      - source: zap
        metric: critical_vulnerabilities
        operator: eq
        threshold: 0
        severity: fail
      - source: zap
        metric: high_vulnerabilities
        operator: eq
        threshold: 0
        severity: fail
      - source: axe
        metric: critical_violations
        operator: eq
        threshold: 0
        severity: fail
      - source: pact
        metric: breaking_changes
        operator: eq
        threshold: 0
        severity: fail

notifications:
  on_pass:
    - slack:
        channel: "#deployments"
        message: "✅ Gate PASSED for {{build_id}} → {{environment}}"
  on_warn:
    - slack:
        channel: "#qa-alerts"
        message: "⚠️ Gate WARNING for {{build_id}} — manual approval required"
  on_fail:
    - slack:
        channel: "#incidents"
        message: "🚫 Gate FAILED for {{build_id}} — deployment blocked"
    - pagerduty:
        severity: "warning"
        routing_key: "${PAGERDUTY_ROUTING_KEY}"
  on_rollback:
    - pagerduty:
        severity: "critical"
        routing_key: "${PAGERDUTY_ROUTING_KEY}"
    - slack:
        channel: "#incidents"
        message: "🔴 ROLLBACK triggered for {{build_id}} in production"
```

---

## Collectors

Each collector implements the `BaseCollector` interface:

```typescript
interface CollectorResult {
  source: string;
  metrics: Record<string, number | string | boolean>;
  raw: unknown;
  collectedAt: Date;
}

abstract class BaseCollector {
  abstract name: string;
  abstract collect(config: CollectorConfig): Promise<CollectorResult>;
  abstract validate(result: unknown): boolean;
}
```

### Adding a Custom Collector

```typescript
// src/collectors/my-tool.collector.ts
import { BaseCollector, CollectorResult, CollectorConfig } from './base.collector';

export class MyToolCollector extends BaseCollector {
  name = 'my-tool';

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    const report = await this.readReport(config.reportPath);
    return {
      source: this.name,
      metrics: {
        pass_rate: report.passed / report.total * 100,
        failures: report.failed,
      },
      raw: report,
      collectedAt: new Date(),
    };
  }
}
```

---

## Getting Started

### Prerequisites

- Node.js 20+
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

# Copy environment config
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
# API docs at http://localhost:3000/docs
```

---

## Usage

### CLI Mode

```bash
# Evaluate a gate with local test results
npx ci-quality-gate evaluate \
  --config gate-config.yml \
  --environment staging \
  --jest-report ./coverage/report.json \
  --k6-report ./load-test/summary.json \
  --zap-report ./security/zap-report.json

# Output:
# ┌─────────────────────────────────────────────┐
# │  GATE VERDICT: PASS ✅                       │
# ├─────────────────────────────────────────────┤
# │  Jest Coverage:     87.3% (≥80%) ✅          │
# │  Playwright Pass:   99.1% (≥98%) ✅          │
# │  k6 p95 Latency:   245ms (≤300ms) ✅        │
# │  ZAP Critical:     0 (=0) ✅                 │
# │  axe Violations:   0 (=0) ✅                 │
# │  Weighted Score:    94/100 (≥80) ✅          │
# └─────────────────────────────────────────────┘
```

### API Mode

```bash
# Evaluate via REST API
curl -X POST http://localhost:3000/api/gates/evaluate \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "buildId": "abc-123",
    "environment": "staging",
    "results": {
      "jest": { "reportPath": "./coverage/report.json" },
      "k6": { "reportPath": "./load-test/summary.json" }
    }
  }'
```

---

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

---

## GitHub Action

Use this engine directly in your workflows:

```yaml
# .github/workflows/deploy.yml
name: Deploy with Quality Gate

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - run: npm run test:perf
      - run: npm run test:security

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

---

## Author

**Darrius Jones**
QA Tester & Automation Engineer

[![GitHub](https://img.shields.io/badge/GitHub-Djones--qa-181717?style=flat&logo=github)](https://github.com/Djones-qa)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Darrius%20Jones-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/darrius-jones-28226b350)

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Tags

`ci-cd` `quality-gate` `test-automation` `devops` `qa-engineering` `continuous-delivery` `pipeline` `github-actions` `typescript` `nodejs` `docker` `postgresql` `redis` `progressive-delivery` `deployment-safety`

---

> Built with purpose by [Darrius Jones](https://github.com/Djones-qa)
