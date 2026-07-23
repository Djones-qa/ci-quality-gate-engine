import { z } from 'zod';

export const OperatorSchema = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between']);

export const SeveritySchema = z.enum(['fail', 'warn', 'info']);

export const RuleSchema = z.object({
  source: z.string(),
  metric: z.string(),
  operator: OperatorSchema,
  threshold: z.union([z.number(), z.array(z.number())]),
  severity: SeveritySchema.default('fail'),
  weight: z.number().min(0).max(100).optional(),
  comparison: z.enum(['absolute', 'baseline']).default('absolute'),
  regression_threshold: z.string().optional(),
  description: z.string().optional(),
});

export const StrategySchema = z.enum([
  'any-fail-blocks',
  'weighted-score',
  'zero-tolerance',
]);

export const EnvironmentSchema = z.object({
  strategy: StrategySchema,
  minimum_score: z.number().min(0).max(100).optional(),
  requires_approval_on_warn: z.boolean().default(false),
  rollback_on_fail: z.boolean().default(false),
  rules: z.array(RuleSchema),
});

export const NotificationTargetSchema = z.union([
  z.object({ slack: z.object({ channel: z.string(), message: z.string().optional() }) }),
  z.object({ teams: z.object({ channel: z.string(), message: z.string().optional() }) }),
  z.object({ pagerduty: z.object({ severity: z.string(), routing_key: z.string().optional() }) }),
]);

export const NotificationsSchema = z.object({
  on_pass: z.array(NotificationTargetSchema).optional(),
  on_warn: z.array(NotificationTargetSchema).optional(),
  on_fail: z.array(NotificationTargetSchema).optional(),
  on_rollback: z.array(NotificationTargetSchema).optional(),
});

export const GateConfigSchema = z.object({
  version: z.string(),
  name: z.string(),
  environments: z.record(z.string(), EnvironmentSchema),
  notifications: NotificationsSchema.optional(),
});

export type Operator = z.infer<typeof OperatorSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Strategy = z.infer<typeof StrategySchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type GateConfig = z.infer<typeof GateConfigSchema>;
export type Notifications = z.infer<typeof NotificationsSchema>;
