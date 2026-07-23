import Redis from 'ioredis';
import { loadAppConfig } from '../config/loader';
import { logger } from '../config/logger';

let client: Redis | null = null;

/**
 * Get or create a Redis client instance.
 */
export function getRedisClient(): Redis {
  if (!client) {
    const config = loadAppConfig();
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    client.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return client;
}

/**
 * Cache a gate decision for quick retrieval.
 */
export async function cacheDecision(
  buildId: string,
  environment: string,
  decision: unknown,
  ttlSeconds: number = 3600,
): Promise<void> {
  const redis = getRedisClient();
  const key = `gate:${buildId}:${environment}`;
  await redis.setex(key, ttlSeconds, JSON.stringify(decision));
  logger.debug(`Cached decision for ${key} (TTL: ${ttlSeconds}s)`);
}

/**
 * Retrieve a cached gate decision.
 */
export async function getCachedDecision(
  buildId: string,
  environment: string,
): Promise<unknown | null> {
  const redis = getRedisClient();
  const key = `gate:${buildId}:${environment}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Acquire a distributed lock for a gate evaluation (prevent duplicate evaluations).
 */
export async function acquireLock(
  buildId: string,
  environment: string,
  ttlSeconds: number = 60,
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `lock:gate:${buildId}:${environment}`;
  const result = await redis.set(key, 'locked', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

/**
 * Release a distributed lock.
 */
export async function releaseLock(buildId: string, environment: string): Promise<void> {
  const redis = getRedisClient();
  const key = `lock:gate:${buildId}:${environment}`;
  await redis.del(key);
}

/**
 * Close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis connection closed');
  }
}
