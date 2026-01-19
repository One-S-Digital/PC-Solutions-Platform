import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger.service';

function safePreview(value: unknown, maxChars: number) {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (str.length <= maxChars) return str;
    return `${str.slice(0, maxChars)}…`;
  } catch {
    return '[unserializable]';
  }
}

function sanitizeBody(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeBody);

  const redactedKeys = new Set([
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'apiKey',
    'secret',
    'clientSecret',
  ]);

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    if (redactedKeys.has(k)) {
      out[k] = '[redacted]';
    } else {
      out[k] = sanitizeBody(v);
    }
  }
  return out;
}

@Injectable()
export class RenderDebugLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.RENDER_BACKEND_DEBUG !== 'true') {
      return next();
    }

    const url = req.originalUrl || req.url || '';
    const shouldLog =
      url.startsWith('/api/promo-codes') ||
      url.startsWith('/api/marketplace/orders') ||
      url.startsWith('/api/marketplace/order');

    if (!shouldLog) {
      return next();
    }

    const start = Date.now();
    const requestId = (req as any).id;

    // Capture response payload preview (best-effort)
    let responsePreview: string | undefined;
    const originalJson = res.json.bind(res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).json = (body: any) => {
      responsePreview = safePreview(body, 2000);
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).send = (body: any) => {
      if (responsePreview === undefined) {
        responsePreview = safePreview(body, 2000);
      }
      return originalSend(body);
    };

    // IMPORTANT: In production we default to `info` log level.
    // Use `info` so Render logs always show this when explicitly enabled.
    this.logger.log('RENDER_DEBUG_REQUEST', 'RenderDebugLogger', {
      requestId,
      method: req.method,
      url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: sanitizeBody((req as any).body),
      query: req.query,
      params: (req as any).params,
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log('RENDER_DEBUG_RESPONSE', 'RenderDebugLogger', {
        requestId,
        method: req.method,
        url,
        statusCode: res.statusCode,
        duration,
        responsePreview,
      });
    });

    next();
  }
}

