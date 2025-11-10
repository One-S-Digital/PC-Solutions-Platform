/**
 * Retry Utility with Exponential Backoff
 * 
 * Automatically retries failed operations with intelligent backoff strategies
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds (default: 1000ms)
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds (default: 30000ms / 30s)
   */
  maxDelay?: number;

  /**
   * Exponential backoff factor (default: 2)
   */
  backoffFactor?: number;

  /**
   * Function to determine if an error should be retried
   */
  shouldRetry?: (error: any, attempt: number) => boolean;

  /**
   * Callback called before each retry attempt
   */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * Default function to determine if an error should be retried
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // Don't retry on the last attempt
  if (attempt >= 3) {
    return false;
  }

  // Retry on network errors
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return true;
  }

  // Retry on timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  // Retry on specific HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    
    // Don't retry client errors (4xx) except rate limiting and timeouts
    if (status >= 400 && status < 500) {
      return status === 429 || status === 408; // Rate limit or timeout
    }

    // Retry on server errors (5xx)
    if (status >= 500) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffFactor: number
): number {
  // Exponential backoff: initialDelay * (backoffFactor ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt - 1);

  // Add jitter (random value between 0 and 500ms) to prevent thundering herd
  const jitter = Math.random() * 500;

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Retry a function with exponential backoff
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await apiClient.get('/data'),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 1000,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms:`, error.message);
 *     }
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts:', result.error);
 * }
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fn();
      
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const willRetry = attempt < maxAttempts && shouldRetry(error, attempt);

      if (!willRetry) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffFactor);

      // Call onRetry callback
      if (onRetry) {
        onRetry(error, attempt, delay);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Wrap a function to automatically retry on failure
 * 
 * @example
 * ```typescript
 * const fetchDataWithRetry = withRetry(
 *   async (id: string) => await apiClient.get(`/data/${id}`),
 *   { maxAttempts: 5 }
 * );
 * 
 * try {
 *   const data = await fetchDataWithRetry('123');
 *   console.log('Data:', data);
 * } catch (error) {
 *   console.error('Failed after retries:', error);
 * }
 * ```
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await retryWithBackoff(
      () => fn(...args),
      options
    );

    if (result.success) {
      return result.data!;
    }

    throw result.error;
  };
}

/**
 * Retry configuration presets for common scenarios
 */
export const RetryPresets = {
  /**
   * Conservative retry (3 attempts, 1-8s delays)
   */
  conservative: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 2,
  } as RetryOptions,

  /**
   * Aggressive retry (5 attempts, 500ms-15s delays)
   */
  aggressive: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 15000,
    backoffFactor: 2,
  } as RetryOptions,

  /**
   * Quick retry (3 attempts, 300ms-3s delays)
   */
  quick: {
    maxAttempts: 3,
    initialDelay: 300,
    maxDelay: 3000,
    backoffFactor: 2,
  } as RetryOptions,

  /**
   * Patient retry (7 attempts, 2-60s delays)
   */
  patient: {
    maxAttempts: 7,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffFactor: 2,
  } as RetryOptions,

  /**
   * Upload retry (specialized for file uploads)
   */
  upload: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2,
    shouldRetry: (error: any, attempt: number) => {
      // Don't retry on validation errors
      if (error.response?.status === 400) {
        return false;
      }
      
      // Don't retry on authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }

      // Retry on network errors and server errors
      return defaultShouldRetry(error, attempt);
    },
  } as RetryOptions,
};

