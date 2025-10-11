import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService, RequestContext } from '../request-context';

/**
 * Middleware to initialize request context with trace ID and user info
 * This context is available throughout the request lifecycle via AsyncLocalStorage
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or extract trace ID
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

    // Build context
    const context: RequestContext = {
      traceId,
      userId: (req as any).user?.id,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
    };

    // Store in async local storage
    RequestContextService.set(context);

    // Add trace ID to response headers
    res.setHeader('X-Trace-Id', traceId);

    // Also attach to request object for easy access
    (req as any).id = traceId;
    (req as any).context = context;

    next();
  }
}
