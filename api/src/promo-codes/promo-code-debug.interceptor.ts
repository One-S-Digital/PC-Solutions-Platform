import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, tap } from 'rxjs';

function safePreview(value: unknown, maxChars: number) {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (str.length <= maxChars) return str;
    return `${str.slice(0, maxChars)}…`;
  } catch {
    return '[unserializable]';
  }
}

function sanitize(value: any): any {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);

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
    out[k] = redactedKeys.has(k) ? '[redacted]' : sanitize(v);
  }
  return out;
}

@Injectable()
export class PromoCodeDebugInterceptor implements NestInterceptor {
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const flag =
      (this.configService.get<string>('PROMO_CODE_DEBUG') || '').toLowerCase() === 'true' ||
      (this.configService.get<string>('PROMO_DEBUG') || '').toLowerCase() === 'true';
    this.enabled = flag;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req: any = http.getRequest();
    const res: any = http.getResponse();
    const start = Date.now();

    // Keep this "console.log" style intentionally (same as Auth Debug),
    // so it always shows up in Render logs even when winston is info-level.
    console.log('🎟️ Promo Debug:', {
      path: req?.url,
      method: req?.method,
      hasContext: !!req?.context,
      context: sanitize(req?.context),
      user: sanitize(req?.user),
      params: sanitize(req?.params),
      query: sanitize(req?.query),
      body: sanitize(req?.body),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - start;
        console.log('🎟️ Promo Debug: response', {
          path: req?.url,
          method: req?.method,
          statusCode: res?.statusCode,
          duration,
          data: safePreview(data, 4000),
        });
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        console.log('🎟️ Promo Debug: error', {
          path: req?.url,
          method: req?.method,
          statusCode: res?.statusCode,
          duration,
          message: err?.message || String(err),
          name: err?.name,
          // Nest HttpException often has a response payload
          response: safePreview(err?.response, 4000),
        });
        throw err;
      }),
    );
  }
}

