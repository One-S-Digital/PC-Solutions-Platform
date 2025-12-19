/**
 * Standard API response utilities for consistent response formatting.
 * 
 * These utilities ensure all API responses follow a consistent structure
 * that the frontend expects: { success: boolean, message: string, data: T, timestamp: string }
 */

/**
 * Standard API response envelope interface
 */
export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Standard API response wrapper for successful operations.
 * @param data The response payload
 * @param message Optional success message (defaults to 'OK')
 * @returns Standardized response object with success flag, message, data, and timestamp
 * 
 * @example
 * ```typescript
 * // In a controller method:
 * const plans = await this.subscriptionService.getAllSubscriptionPlans();
 * return wrapResponse(plans);
 * 
 * // With custom message:
 * const plan = await this.subscriptionService.createSubscriptionPlan(planData);
 * return wrapResponse(plan, 'Subscription plan created successfully');
 * ```
 */
export function wrapResponse<T>(data: T, message = 'OK'): ApiResponseEnvelope<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standard API response wrapper for error operations.
 * @param message Error message
 * @returns Standardized error response object with success=false
 * 
 * @example
 * ```typescript
 * // In a controller method:
 * return wrapErrorResponse('Failed to process subscription');
 * ```
 */
export function wrapErrorResponse(message: string): ApiResponseEnvelope<null> {
  return {
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
}
