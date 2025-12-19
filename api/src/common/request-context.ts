import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  traceId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
}

// Create async local storage instance
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Service to manage request-scoped context
 * Uses Node.js AsyncLocalStorage to maintain context across async operations
 */
export class RequestContextService {
  /**
   * Get the current request context
   */
  static get(): RequestContext | undefined {
    return requestContext.getStore();
  }

  /**
   * Get a specific value from request context
   */
  static getValue<K extends keyof RequestContext>(key: K): RequestContext[K] | undefined {
    return this.get()?.[key];
  }

  /**
   * Get trace ID (or 'unknown' if not set)
   */
  static getTraceId(): string {
    return this.getValue('traceId') || 'unknown';
  }

  /**
   * Get user ID (or undefined if not authenticated)
   */
  static getUserId(): string | undefined {
    return this.getValue('userId');
  }

  /**
   * Get client IP address
   */
  static getIp(): string | undefined {
    return this.getValue('ip');
  }

  /**
   * Set request context (called by middleware)
   */
  static set(context: RequestContext): void {
    requestContext.enterWith(context);
  }

  /**
   * Update specific fields in existing context
   */
  static update(partial: Partial<RequestContext>): void {
    const current = this.get();
    if (current) {
      this.set({ ...current, ...partial });
    }
  }

  /**
   * Execute function with specific context
   */
  static run<T>(context: RequestContext, fn: () => T): T {
    return requestContext.run(context, fn);
  }

  /**
   * Get all context as object (for logging)
   */
  static toObject(): RequestContext | undefined {
    return this.get();
  }
}
