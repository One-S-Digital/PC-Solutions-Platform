import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse && typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message || 'An error occurred'
          : 'Internal server error';

    // Only report server errors (5xx) and unexpected errors to Sentry
    if (status >= 500) {
      Sentry.captureException(exception, {
        contexts: {
          http: {
            method: request.method,
            url: request.url,
            status_code: status,
          },
        },
        tags: {
          endpoint: request.path,
          method: request.method,
        },
        user: request.user
          ? {
              id: (request.user as any).id,
              // Don't send email or other PII
            }
          : undefined,
      });
    }

    // Return the error response to the client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
