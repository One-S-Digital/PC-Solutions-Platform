import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiEnvelopeDto, ApiError } from '../dto/api-envelope.dto';

/**
 * Global exception filter that normalizes all errors into consistent API responses
 * Handles: Prisma errors, R2/S3 errors, NestJS HttpExceptions, and unexpected errors
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Get trace ID from request (if available)
    const traceId = (request as any).id || 'unknown';

    // Normalize the error
    const normalized = this.normalizeError(exception);

    // Log error (with different levels based on severity)
    if (normalized.status >= 500) {
      this.logger.error({
        traceId,
        url: request.url,
        method: request.method,
        error: exception.message,
        stack: exception.stack,
        userId: (request as any).user?.id,
      });
    } else {
      this.logger.warn({
        traceId,
        url: request.url,
        method: request.method,
        error: exception.message,
        status: normalized.status,
      });
    }

    // Build error response
    const errorResponse: ApiEnvelopeDto<never> = {
      success: false,
      version: 1,
      timestamp: new Date().toISOString(),
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details && { details: normalized.details }),
      },
      traceId,
    };

    response.status(normalized.status).json(errorResponse);
  }

  /**
   * Normalize various error types into consistent format
   */
  private normalizeError(exception: any): {
    status: number;
    code: string;
    message: string;
    details?: any;
  } {
    // Prisma errors (P2xxx codes)
    if (exception.code?.startsWith('P2')) {
      return this.normalizePrismaError(exception);
    }

    // R2/S3 errors
    if (exception.name && this.isStorageError(exception.name)) {
      return this.normalizeStorageError(exception);
    }

    // NestJS HttpException
    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    // Unknown/Unexpected errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? exception.message : undefined,
    };
  }

  /**
   * Normalize Prisma errors
   * Reference: https://www.prisma.io/docs/reference/api-reference/error-reference
   */
  private normalizePrismaError(exception: any): {
    status: number;
    code: string;
    message: string;
    details?: any;
  } {
    const prismaErrors: Record<string, { status: number; code: string; message: string }> = {
      // Unique constraint violation
      P2002: {
        status: HttpStatus.CONFLICT,
        code: 'DUPLICATE',
        message: 'A record with this value already exists',
      },
      // Foreign key constraint violation
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist',
      },
      // Record not found
      P2025: {
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'Record not found',
      },
      // Constraint violation
      P2000: {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: 'The provided value is invalid',
      },
      // Record required but not found
      P2015: {
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'Related record not found',
      },
      // Transaction failed
      P2034: {
        status: HttpStatus.CONFLICT,
        code: 'TRANSACTION_FAILED',
        message: 'Transaction could not be completed. Please try again',
      },
    };

    const errorInfo = prismaErrors[exception.code] || {
      status: HttpStatus.BAD_REQUEST,
      code: 'DATABASE_ERROR',
      message: exception.meta?.cause || exception.message || 'Database operation failed',
    };

    return {
      ...errorInfo,
      details: {
        target: exception.meta?.target,
        ...(process.env.NODE_ENV === 'development' && {
          prismaCode: exception.code,
          meta: exception.meta,
        }),
      },
    };
  }

  /**
   * Normalize R2/S3 storage errors
   */
  private normalizeStorageError(exception: any): {
    status: number;
    code: string;
    message: string;
  } {
    const storageErrors: Record<string, { status: number; code: string; message: string }> = {
      NoSuchKey: {
        status: HttpStatus.NOT_FOUND,
        code: 'FILE_NOT_FOUND',
        message: 'The requested file does not exist',
      },
      AccessDenied: {
        status: HttpStatus.FORBIDDEN,
        code: 'STORAGE_ACCESS_DENIED',
        message: 'Access to storage was denied',
      },
      InvalidBucketName: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'STORAGE_CONFIG_ERROR',
        message: 'Storage configuration error',
      },
      EntityTooLarge: {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum allowed size',
      },
    };

    return storageErrors[exception.name] || {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'STORAGE_ERROR',
      message: 'Storage operation failed',
    };
  }

  /**
   * Normalize NestJS HttpException
   */
  private normalizeHttpException(exception: HttpException): {
    status: number;
    code: string;
    message: string;
    details?: any;
  } {
    const status = exception.getStatus();
    const response = exception.getResponse();

    let code = exception.constructor.name.replace('Exception', '').toUpperCase();
    let message = exception.message;
    let details: any;

    // If response is an object, extract details
    if (typeof response === 'object' && response !== null) {
      const responseObj = response as any;
      message = responseObj.message || message;
      code = responseObj.code || code;
      details = responseObj.details;

      // Handle validation errors
      if (Array.isArray(responseObj.message)) {
        message = 'Validation failed';
        details = { validationErrors: responseObj.message };
      }
    }

    return {
      status,
      code,
      message,
      details,
    };
  }

  /**
   * Check if error is a storage/S3 error
   */
  private isStorageError(errorName: string): boolean {
    const storageErrorNames = [
      'NoSuchKey',
      'AccessDenied',
      'InvalidBucketName',
      'EntityTooLarge',
      'NoSuchBucket',
      'BucketAlreadyExists',
      'InvalidObjectState',
    ];
    return storageErrorNames.includes(errorName);
  }
}
