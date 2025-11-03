import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    if (request?.headers) {
      delete request.headers['if-none-match'];
      delete request.headers['if-modified-since'];
    }

    if (response?.setHeader) {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Vary', 'Origin');
    }

    if (typeof response?.set === 'function') {
      response.set('etag', false as any);
    }

    return next.handle();
  }
}
