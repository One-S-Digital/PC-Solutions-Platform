import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

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

    // Log full error details
    this.logger.error('🔍 [DEBUG] Exception caught - Full Details', errorDetails);

    // Also log in a more readable format
    console.error('🔍 [DEBUG] ========== EXCEPTION DETAILS ==========');
    console.error('🔍 [DEBUG] Status:', status);
    console.error('🔍 [DEBUG] Message:', message);
    console.error('🔍 [DEBUG] Path:', request?.url);
    console.error('🔍 [DEBUG] Method:', request?.method);
    if (exception instanceof Error) {
      console.error('🔍 [DEBUG] Error Name:', exception.name);
      console.error('🔍 [DEBUG] Error Message:', exception.message);
      console.error('🔍 [DEBUG] Error Stack:', exception.stack);
    }
    if ((exception as any)?.code) {
      console.error('🔍 [DEBUG] Prisma Code:', (exception as any).code);
      try {
        console.error('🔍 [DEBUG] Prisma Meta:', JSON.stringify((exception as any).meta, null, 2));
      } catch {
        console.error('🔍 [DEBUG] Prisma Meta: [Unable to stringify]');
      }
    }
    try {
      console.error('🔍 [DEBUG] Full Error Object:', JSON.stringify(exception, Object.getOwnPropertyNames(exception), 2));
    } catch {
      console.error('🔍 [DEBUG] Full Error Object: [Circular reference or non-serializable]');
    }
    console.error('🔍 [DEBUG] ========================================');

    // Set CORS headers to match main.ts configuration
    // This ensures error responses include CORS headers, preventing browser CORS errors
    const origin = request.headers.origin;
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://app.procrechesolutions.com', 
          'https://admin.procrechesolutions.com'
        ]
      : true;

    if (allowedOrigins === true || (origin && Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
      response.setHeader('Access-Control-Allow-Origin', origin || (allowedOrigins === true ? '*' : (Array.isArray(allowedOrigins) ? allowedOrigins[0] : '*')));
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, svix-id, svix-timestamp, svix-signature');
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}
