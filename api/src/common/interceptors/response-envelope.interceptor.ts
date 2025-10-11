import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const SKIP_ENVELOPE = 'skipEnvelope';

/**
 * Decorator to skip automatic envelope wrapping
 */
export const SkipEnvelope = () => {
  const SetMetadata = Reflect.metadata || ((k, v) => (target: any, key?: any) => {
    if (key) {
      Reflect.defineMetadata(k, v, target, key);
    } else {
      Reflect.defineMetadata(k, v, target);
    }
  });
  return SetMetadata(SKIP_ENVELOPE, true);
};

/**
 * Automatically wraps responses in ApiEnvelope format
 * Can be disabled per-endpoint with @SkipEnvelope()
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipEnvelope = this.reflector.get<boolean>(
      SKIP_ENVELOPE,
      context.getHandler()
    );

    // Skip if decorator is present or response is already wrapped
    if (skipEnvelope) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already an ApiEnvelope, return as-is
        if (data && typeof data === 'object' && 'success' in data && 'version' in data) {
          return data;
        }

        // Wrap in envelope
        return {
          success: true,
          version: 1,
          timestamp: new Date().toISOString(),
          data,
        };
      })
    );
  }
}
