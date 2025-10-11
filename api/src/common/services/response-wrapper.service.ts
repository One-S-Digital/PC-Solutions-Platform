import { Injectable } from '@nestjs/common';
import { ApiEnvelopeDto, ApiError } from '../dto/api-envelope.dto';

@Injectable()
export class ResponseWrapperService {
  /**
   * Wrap successful response data in standard envelope
   */
  success<T>(data: T, version: number = 1): ApiEnvelopeDto<T> {
    return {
      success: true,
      version,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  /**
   * Wrap error in standard envelope
   */
  error(
    error: ApiError,
    version: number = 1,
    traceId?: string
  ): ApiEnvelopeDto<never> {
    return {
      success: false,
      version,
      timestamp: new Date().toISOString(),
      error,
      traceId,
    };
  }

  /**
   * Wrap paginated data with metadata
   */
  paginated<T>(
    data: T[],
    meta: {
      total: number;
      page: number;
      limit: number;
      hasMore?: boolean;
    },
    version: number = 1
  ): ApiEnvelopeDto<{ items: T[]; meta: typeof meta }> {
    return this.success(
      {
        items: data,
        meta: {
          ...meta,
          hasMore: meta.hasMore ?? (meta.page * meta.limit < meta.total),
        },
      },
      version
    );
  }

  /**
   * Create error object from exception
   */
  createError(code: string, message: string, details?: any): ApiError {
    return {
      code,
      message,
      ...(details && { details }),
    };
  }
}
