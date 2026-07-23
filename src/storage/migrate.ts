import { readFile } from 'fs/promises';
import { resolve, join } from 'path';
import { getPool, closePool } from './postgres.client';
import { logger } from '../config/logger';

const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

/**
 * Run all SQL migration files in order.
 */
async function runMigrations(): Promise<void> {
  const pool = getPool();

  const migrationFiles = [
    '001_create_decisions.sql',
    '002_create_metrics.sql',
    '003_create_trends.sql',
  ];

  logger.info('Running database migrations...');

  for (const file of migrationFiles) {
    const filePath = join(MIGRATIONS_DIR, file);
    try {
      const sql = await readFile(filePath, 'utf-8');
      await pool.query(sql);
      logger.info(`  ✓ ${file}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`  ✗ ${file}: ${message}`);
      throw error;
    }
  }

  logger.info('All migrations completed successfully');
  await closePool();
}

// Run if called directly
runMigrations().catch((err) => {
  logger.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
