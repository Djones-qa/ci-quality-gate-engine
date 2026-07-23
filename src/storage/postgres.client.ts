import { Pool, PoolConfig } from 'pg';
import { loadAppConfig } from '../config/loader';
import { logger } from '../config/logger';
import { GateDecision } from '../engine/decision';

let pool: Pool | null = null;

/**
 * Get or create a PostgreSQL connection pool.
 */
export function getPool(): Pool {
  if (!pool) {
    const config = loadAppConfig();
    const poolConfig: PoolConfig = {
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error(`PostgreSQL pool error: ${err.message}`);
    });
  }
  return pool;
}

/**
 * Save a gate decision to the database.
 */
export async function saveDecision(decision: GateDecision): Promise<string> {
  const db = getPool();

  const result = await db.query(
    `INSERT INTO decisions (build_id, environment, verdict, score, strategy, summary, results, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      decision.buildId,
      decision.environment,
      decision.verdict,
      decision.score,
      decision.strategy,
      JSON.stringify(decision.summary),
      JSON.stringify(decision.results),
      decision.timestamp,
    ],
  );

  const id = result.rows[0].id;
  logger.info(`Saved decision ${id} for build ${decision.buildId}`);
  return id;
}

/**
 * Fetch a decision by ID.
 */
export async function getDecisionById(id: string): Promise<GateDecision | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM decisions WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Fetch recent decisions with pagination.
 */
export async function getDecisions(
  limit: number = 50,
  offset: number = 0,
  environment?: string,
): Promise<{ decisions: unknown[]; total: number }> {
  const db = getPool();

  let query = 'SELECT * FROM decisions';
  const params: (string | number)[] = [];

  if (environment) {
    query += ' WHERE environment = $1';
    params.push(environment);
  }

  query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  const countQuery = environment
    ? 'SELECT COUNT(*) FROM decisions WHERE environment = $1'
    : 'SELECT COUNT(*) FROM decisions';
  const countParams = environment ? [environment] : [];
  const countResult = await db.query(countQuery, countParams);

  return {
    decisions: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Close the connection pool.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
}
