import { ApiProperty } from '@nestjs/swagger';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiEnvelopeDto<T = any> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'API version for this response',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'ISO 8601 timestamp of the response',
    example: '2025-10-11T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Response data (when successful)',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Error details (when unsuccessful)',
    required: false,
  })
  error?: ApiError;

  @ApiProperty({
    description: 'Trace ID for debugging',
    required: false,
  })
  traceId?: string;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiEnvelopeDto<T>
): response is ApiEnvelopeDto<T> & { data: T } {
  return response.success && response.data !== undefined;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse<T>(
  response: ApiEnvelopeDto<T>
): response is ApiEnvelopeDto<T> & { error: ApiError } {
  return !response.success && response.error !== undefined;
}
