/**
 * Parse REDIS_URL when REDIS_HOST is not explicitly set.
 * Bull v4 passes options directly to ioredis, which has no `url` property,
 * so we decompose the URL into host/port/password manually.
 */
const _redisUrl = (!process.env.REDIS_HOST && process.env.REDIS_URL)
  ? (() => { try { return new URL(process.env.REDIS_URL!); } catch { return null; } })()
  : null;

/**
 * True only when a Redis host or URL is explicitly configured.
 * BullModule registration is skipped entirely when false so the app
 * boots without Redis (queue workers are simply unavailable).
 */
export const REDIS_ENABLED = !!(process.env.REDIS_HOST || _redisUrl);

/**
 * Shared Redis connection options for Bull queues.
 *
 * Centralised here so that BullModule.forRoot() (app.module)
 * and BullModule.registerQueue() (translation-queue.module)
 * stay in sync and any change to retry / timeout policy
 * only has to be made in one place.
 */
export const sharedRedisOptions = {
  host: process.env.REDIS_HOST || _redisUrl?.hostname || 'localhost',
  port: parseInt(process.env.REDIS_PORT || _redisUrl?.port || '6379'),
  password: process.env.REDIS_PASSWORD || _redisUrl?.password || undefined,
  /** Fail fast instead of blocking the request thread for minutes. */
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  retryStrategy(times: number) {
    if (times > 3) {
      // Stop retrying after 3 attempts – don't block the application
      return null;
    }
    return Math.min(times * 500, 2000);
  },
  enableReadyCheck: false,
};
