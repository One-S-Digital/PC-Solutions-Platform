import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Interceptor to track HTTP request metrics
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          
          this.metricsService.trackHttpRequest(
            request.method,
            this.sanitizePath(request.route?.path || request.url),
            response.statusCode,
            duration
          );
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          
          this.metricsService.trackHttpRequest(
            request.method,
            this.sanitizePath(request.route?.path || request.url),
            error.status || 500,
            duration
          );
        },
      })
    );
  }

  /**
   * Sanitize path to avoid high cardinality (remove IDs)
   */
  private sanitizePath(path: string): string {
    // Replace UUIDs and numeric IDs with :id
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }
}
