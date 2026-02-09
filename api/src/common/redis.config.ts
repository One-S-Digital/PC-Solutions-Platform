/**
 * Shared Redis connection options for Bull queues.
 *
 * Centralised here so that BullModule.forRoot() (app.module)
 * and BullModule.registerQueue() (translation-queue.module)
 * stay in sync and any change to retry / timeout policy
 * only has to be made in one place.
 */
export const sharedRedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
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
