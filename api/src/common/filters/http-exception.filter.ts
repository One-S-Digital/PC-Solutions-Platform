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

    this.logger.error('Exception caught', {
      status,
      message,
      path: request?.url,
      method: request?.method,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    });

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
