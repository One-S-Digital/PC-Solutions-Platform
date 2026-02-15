import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { getProductionAllowedOrigins, normalizeOrigin } from '../cors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any)?.message ?? message;
    }

    // Enhanced error logging with full details
    const errorDetails: any = {
      status,
      message,
      path: request?.url,
      method: request?.method,
      timestamp: new Date().toISOString(),
    };

    // Always log error details (sanitized for production)
    if (exception instanceof Error) {
      errorDetails.errorName = exception.name;
      errorDetails.errorMessage = exception.message;
      errorDetails.errorStack = exception.stack;
    }

    // Prisma-specific error details
    if ((exception as any)?.code) {
      errorDetails.prismaCode = (exception as any).code;
      errorDetails.prismaMeta = (exception as any).meta;
    }

    // Additional error properties
    if (exception && typeof exception === 'object') {
      const errorObj = exception as any;
      errorDetails.errorProperties = Object.keys(errorObj).filter(
        key => !['stack', 'message', 'name'].includes(key)
      );
      
      // Log specific known error properties
      if (errorObj.code) errorDetails.code = errorObj.code;
      if (errorObj.meta) errorDetails.meta = errorObj.meta;
      if (errorObj.cause) errorDetails.cause = errorObj.cause;
    }

    // Log error details (verbose output only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.error('Exception caught - Full Details', errorDetails);
    } else {
      // Production: log minimal details without PII
      // Strip query string from URL to avoid logging sensitive parameters
      const safePath = request?.url?.split('?')[0];
      this.logger.error('Exception', {
        status,
        path: safePath,
        method: request?.method,
        errorName: exception instanceof Error ? exception.name : undefined,
        prismaCode: (exception as any)?.code,
      });
    }

    // Set CORS headers to match main.ts configuration
    // This ensures error responses include CORS headers, preventing browser CORS errors
    const origin = normalizeOrigin(request.headers.origin);
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? getProductionAllowedOrigins()
      : null;

    // Only set Access-Control-Allow-Origin when we have an Origin header. Using '*' with credentials breaks CORS.
    const originAllowed =
      !!origin &&
      (process.env.NODE_ENV !== 'production' || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)));

    if (originAllowed) {
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, svix-id, svix-timestamp, svix-signature, X-Trace-Id',
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}
