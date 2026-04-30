/**
 * Shared Redis connection options for Bull queues.
 *
 * Centralised here so that BullModule.forRoot() (app.module)
 * and BullModule.registerQueue() (translation-queue.module)
 * stay in sync and any change to retry / timeout policy
 * only has to be made in one place.
 */
interface RedisBaseOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
}

const DEFAULT_REDIS_PORT = 6379;

function parseRedisPort(value: string | undefined, fallback = DEFAULT_REDIS_PORT): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRedisDb(pathname: string): number | undefined {
  if (!pathname || pathname === '/') {
    return undefined;
  }

  const parsed = Number.parseInt(pathname.replace(/^\//, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveRedisBaseOptions(): RedisBaseOptions | null {
  const queueToggle = process.env.REDIS_QUEUE_ENABLED ?? process.env.REDIS_ENABLED;
  if (queueToggle === 'false') {
    return null;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
      const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

      return {
        host: parsed.hostname,
        port: parseRedisPort(parsed.port),
        username: username || process.env.REDIS_USERNAME,
        password: password || process.env.REDIS_PASSWORD,
        db: parseRedisDb(parsed.pathname),
        ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
      };
    } catch {
      // Invalid REDIS_URL; fall back to host/port env handling below.
    }
  }

  const redisHost = process.env.REDIS_HOST?.trim();
  if (redisHost) {
    return {
      host: redisHost,
      port: parseRedisPort(process.env.REDIS_PORT),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    };
  }

  // Keep localhost fallback for local development only.
  if (process.env.NODE_ENV !== 'production' || queueToggle === 'true') {
    return {
      host: 'localhost',
      port: parseRedisPort(process.env.REDIS_PORT),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    };
  }

  // Production without explicit Redis configuration should not start queue workers.
  return null;
}

const resolvedRedisBaseOptions = resolveRedisBaseOptions();

/**
 * Whether Redis-backed queues should be initialized.
 * In production, queues are disabled unless Redis is explicitly configured.
 */
export const isRedisQueueEnabled = resolvedRedisBaseOptions !== null;

export const sharedRedisOptions = {
  host: resolvedRedisBaseOptions?.host ?? 'localhost',
  port: resolvedRedisBaseOptions?.port ?? DEFAULT_REDIS_PORT,
  username: resolvedRedisBaseOptions?.username,
  password: resolvedRedisBaseOptions?.password,
  db: resolvedRedisBaseOptions?.db,
  tls: resolvedRedisBaseOptions?.tls,
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
