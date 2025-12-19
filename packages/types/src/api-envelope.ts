/**
 * Standard API response envelope
 * All API responses should be wrapped in this structure
 */
export interface ApiEnvelope<T = any> {
  success: boolean;
  version: number;
  timestamp: string;
  data?: T;
  error?: ApiError;
  traceId?: string;
}

/**
 * Standard error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiEnvelope<T>
): response is ApiEnvelope<T> & { data: T } {
  return response.success && response.data !== undefined;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse<T>(
  response: ApiEnvelope<T>
): response is ApiEnvelope<T> & { error: ApiError } {
  return !response.success && response.error !== undefined;
}
