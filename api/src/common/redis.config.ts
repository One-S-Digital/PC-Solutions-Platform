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

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  );
}

function parseRedisDb(pathname: string): number | undefined {
  if (!pathname || pathname === '/') {
    return undefined;
  }

  const parsed = Number.parseInt(pathname.replace(/^\//, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface RedisResolution {
  enabled: boolean;
  options: RedisBaseOptions | null;
  reason: string;
}

function resolveRedisConfiguration(): RedisResolution {
  const queueToggleRaw = process.env.REDIS_QUEUE_ENABLED ?? process.env.REDIS_ENABLED;
  const queueToggle = parseBoolean(queueToggleRaw);
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const isDevelopmentLike = nodeEnv === 'development' || nodeEnv === 'test';
  const allowLocalRedis = parseBoolean(process.env.ALLOW_LOCAL_REDIS) === true;

  if (queueToggle === false) {
    return {
      enabled: false,
      options: null,
      reason: 'disabled via REDIS_QUEUE_ENABLED/REDIS_ENABLED',
    };
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  let hasInvalidRedisUrl = false;
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
        throw new Error('Invalid Redis URL protocol');
      }
      if (!allowLocalRedis && !isDevelopmentLike && isLoopbackHost(parsed.hostname)) {
        return {
          enabled: false,
          options: null,
          reason: 'REDIS_URL points to loopback host in non-dev environment',
        };
      }

      const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
      const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

      return {
        enabled: true,
        options: {
          host: parsed.hostname,
          port: parseRedisPort(parsed.port),
          username: username || process.env.REDIS_USERNAME,
          password: password || process.env.REDIS_PASSWORD,
          db: parseRedisDb(parsed.pathname),
          ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
        },
        reason: 'configured via REDIS_URL',
      };
    } catch {
      hasInvalidRedisUrl = true;
    }
  }

  const redisHost = process.env.REDIS_HOST?.trim();
  if (redisHost) {
    if (!allowLocalRedis && !isDevelopmentLike && isLoopbackHost(redisHost)) {
      return {
        enabled: false,
        options: null,
        reason: 'REDIS_HOST is loopback in non-dev environment',
      };
    }

    return {
      enabled: true,
      options: {
        host: redisHost,
        port: parseRedisPort(process.env.REDIS_PORT),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
      },
      reason: 'configured via REDIS_HOST/REDIS_PORT',
    };
  }

  // Only allow implicit localhost fallback in explicit dev/test environments.
  if (isDevelopmentLike) {
    return {
      enabled: true,
      options: {
        host: 'localhost',
        port: parseRedisPort(process.env.REDIS_PORT),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
      },
      reason: 'localhost fallback for development/test',
    };
  }

  if (hasInvalidRedisUrl) {
    return {
      enabled: false,
      options: null,
      reason: 'invalid REDIS_URL and REDIS_HOST not configured',
    };
  }

  if (queueToggle === true) {
    return {
      enabled: false,
      options: null,
      reason: 'REDIS queue requested but REDIS_URL/REDIS_HOST missing',
    };
  }

  return {
    enabled: false,
    options: null,
    reason: 'Redis queue disabled (no Redis configuration)',
  };
}

const redisResolution = resolveRedisConfiguration();
const resolvedRedisBaseOptions = redisResolution.options;

/**
 * Whether Redis-backed queues should be initialized.
 * In production, queues are disabled unless Redis is explicitly configured.
 */
export const isRedisQueueEnabled = redisResolution.enabled;
export const redisQueueStatusReason = redisResolution.reason;

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
