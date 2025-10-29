/**
 * Auth Error Types - Shared across frontend and backend
 * 
 * Provides structured, user-friendly error handling for authentication flows
 */

export enum AuthErrorType {
  // User sync errors
  WEBHOOK_TIMEOUT = 'webhook_timeout',
  CLERK_API_ERROR = 'clerk_api_error',
  DATABASE_ERROR = 'database_error',
  USER_NOT_FOUND = 'user_not_found',
  USER_PENDING = 'user_pending',
  SYNC_IN_PROGRESS = 'sync_in_progress',
  SYNC_FAILED = 'sync_failed',
  
  // Authentication errors
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  NO_TOKEN = 'no_token',
  UNAUTHORIZED = 'unauthorized',
  
  // Configuration errors
  MISSING_CONFIG = 'missing_config',
  INVALID_CONFIG = 'invalid_config',
  CLERK_SECRET_MISSING = 'clerk_secret_missing',
  WEBHOOK_SECRET_MISSING = 'webhook_secret_missing',
  
  // Network errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  
  // Validation errors
  INVALID_EMAIL = 'invalid_email',
  INVALID_PASSWORD = 'invalid_password',
  INVALID_ROLE = 'invalid_role',
  
  // Generic
  UNKNOWN_ERROR = 'unknown_error',
}

export interface AuthErrorDetails {
  type: AuthErrorType;
  message: string;
  recoverable: boolean;
  retryAfter?: number; // milliseconds
  actionRequired?: string; // What user should do
  technicalDetails?: string; // For developers/support
  statusCode?: number; // HTTP status code if applicable
}

export class AuthError extends Error {
  public readonly type: AuthErrorType;
  public readonly recoverable: boolean;
  public readonly retryAfter?: number;
  public readonly actionRequired?: string;
  public readonly technicalDetails?: string;
  public readonly statusCode?: number;

  constructor(details: AuthErrorDetails) {
    super(details.message);
    this.name = 'AuthError';
    this.type = details.type;
    this.recoverable = details.recoverable;
    this.retryAfter = details.retryAfter;
    this.actionRequired = details.actionRequired;
    this.technicalDetails = details.technicalDetails;
    this.statusCode = details.statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }

  /**
   * Convert to plain object (for logging/serialization)
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      recoverable: this.recoverable,
      retryAfter: this.retryAfter,
      actionRequired: this.actionRequired,
      technicalDetails: this.technicalDetails,
      statusCode: this.statusCode,
      stack: this.stack,
    };
  }

  /**
   * Create from generic error
   */
  static fromError(error: any, defaultType: AuthErrorType = AuthErrorType.UNKNOWN_ERROR): AuthError {
    if (error instanceof AuthError) {
      return error;
    }

    return new AuthError({
      type: defaultType,
      message: error?.message || 'An unknown error occurred',
      recoverable: true,
      technicalDetails: error?.stack,
    });
  }
}

/**
 * Predefined error factories for common scenarios
 */
export const AuthErrors = {
  webhookTimeout: (clerkId: string): AuthError => new AuthError({
    type: AuthErrorType.WEBHOOK_TIMEOUT,
    message: 'Your account is being set up. This usually takes just a moment.',
    recoverable: true,
    retryAfter: 3000,
    actionRequired: 'Please wait a moment and try again',
    technicalDetails: `Webhook timeout for user ${clerkId}`,
  }),

  clerkApiError: (message: string): AuthError => new AuthError({
    type: AuthErrorType.CLERK_API_ERROR,
    message: 'Unable to connect to authentication service',
    recoverable: false,
    actionRequired: 'Please contact support if this persists',
    technicalDetails: message,
    statusCode: 503,
  }),

  databaseError: (message: string): AuthError => new AuthError({
    type: AuthErrorType.DATABASE_ERROR,
    message: 'A temporary issue occurred. Please try again.',
    recoverable: true,
    retryAfter: 5000,
    actionRequired: 'Retry in a few moments',
    technicalDetails: message,
    statusCode: 500,
  }),

  userNotFound: (clerkId: string): AuthError => new AuthError({
    type: AuthErrorType.USER_NOT_FOUND,
    message: 'User account not found',
    recoverable: true,
    actionRequired: 'Please sign up or contact support',
    technicalDetails: `User ${clerkId} not found in database`,
    statusCode: 404,
  }),

  userPending: (clerkId: string): AuthError => new AuthError({
    type: AuthErrorType.USER_PENDING,
    message: 'Your account is being processed',
    recoverable: true,
    retryAfter: 2000,
    actionRequired: 'Please wait a moment',
    technicalDetails: `User ${clerkId} is still pending webhook processing`,
  }),

  syncInProgress: (clerkId: string): AuthError => new AuthError({
    type: AuthErrorType.SYNC_IN_PROGRESS,
    message: 'Account sync in progress',
    recoverable: true,
    retryAfter: 1000,
    actionRequired: 'Please wait',
    technicalDetails: `Sync already in progress for ${clerkId}`,
  }),

  invalidToken: (): AuthError => new AuthError({
    type: AuthErrorType.INVALID_TOKEN,
    message: 'Your session is invalid',
    recoverable: false,
    actionRequired: 'Please sign in again',
    statusCode: 401,
  }),

  tokenExpired: (): AuthError => new AuthError({
    type: AuthErrorType.TOKEN_EXPIRED,
    message: 'Your session has expired',
    recoverable: false,
    actionRequired: 'Please sign in again',
    statusCode: 401,
  }),

  noToken: (): AuthError => new AuthError({
    type: AuthErrorType.NO_TOKEN,
    message: 'Authentication required',
    recoverable: false,
    actionRequired: 'Please sign in',
    statusCode: 401,
  }),

  missingConfig: (configName: string): AuthError => new AuthError({
    type: AuthErrorType.MISSING_CONFIG,
    message: 'Authentication service is not properly configured',
    recoverable: false,
    actionRequired: 'Please contact support',
    technicalDetails: `Missing configuration: ${configName}`,
    statusCode: 500,
  }),

  clerkSecretMissing: (): AuthError => new AuthError({
    type: AuthErrorType.CLERK_SECRET_MISSING,
    message: 'Authentication service configuration error',
    recoverable: false,
    actionRequired: 'Please contact support',
    technicalDetails: 'CLERK_SECRET_KEY not configured',
    statusCode: 500,
  }),

  networkError: (message: string): AuthError => new AuthError({
    type: AuthErrorType.NETWORK_ERROR,
    message: 'Network connection error',
    recoverable: true,
    retryAfter: 3000,
    actionRequired: 'Check your internet connection and try again',
    technicalDetails: message,
  }),

  serverError: (message: string): AuthError => new AuthError({
    type: AuthErrorType.SERVER_ERROR,
    message: 'A server error occurred',
    recoverable: true,
    retryAfter: 5000,
    actionRequired: 'Please try again in a moment',
    technicalDetails: message,
    statusCode: 500,
  }),
};

/**
 * Error message mapper for frontend display
 */
export interface ErrorDisplayInfo {
  title: string;
  message: string;
  action: string;
  variant: 'error' | 'warning' | 'info';
  showRetry: boolean;
  showSupport: boolean;
}

export const getErrorDisplayInfo = (error: AuthError): ErrorDisplayInfo => {
  const baseInfo: Record<AuthErrorType, ErrorDisplayInfo> = {
    [AuthErrorType.WEBHOOK_TIMEOUT]: {
      title: 'Almost there!',
      message: error.message,
      action: 'Retry',
      variant: 'info',
      showRetry: true,
      showSupport: false,
    },
    [AuthErrorType.CLERK_API_ERROR]: {
      title: 'Connection Issue',
      message: error.message,
      action: 'Contact Support',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.DATABASE_ERROR]: {
      title: 'Temporary Issue',
      message: error.message,
      action: 'Retry',
      variant: 'warning',
      showRetry: true,
      showSupport: true,
    },
    [AuthErrorType.USER_NOT_FOUND]: {
      title: 'Account Not Found',
      message: error.message,
      action: 'Sign Up',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.USER_PENDING]: {
      title: 'Setting Up Your Account',
      message: error.message,
      action: 'Wait',
      variant: 'info',
      showRetry: true,
      showSupport: false,
    },
    [AuthErrorType.SYNC_IN_PROGRESS]: {
      title: 'Please Wait',
      message: error.message,
      action: 'Wait',
      variant: 'info',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.INVALID_TOKEN]: {
      title: 'Session Invalid',
      message: error.message,
      action: 'Sign In Again',
      variant: 'error',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.TOKEN_EXPIRED]: {
      title: 'Session Expired',
      message: error.message,
      action: 'Sign In Again',
      variant: 'warning',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.NO_TOKEN]: {
      title: 'Not Signed In',
      message: error.message,
      action: 'Sign In',
      variant: 'info',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.MISSING_CONFIG]: {
      title: 'Configuration Error',
      message: error.message,
      action: 'Contact Support',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.INVALID_CONFIG]: {
      title: 'Configuration Error',
      message: error.message,
      action: 'Contact Support',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.CLERK_SECRET_MISSING]: {
      title: 'Configuration Error',
      message: error.message,
      action: 'Contact Support',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.WEBHOOK_SECRET_MISSING]: {
      title: 'Configuration Error',
      message: error.message,
      action: 'Contact Support',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.NETWORK_ERROR]: {
      title: 'Connection Error',
      message: error.message,
      action: 'Retry',
      variant: 'warning',
      showRetry: true,
      showSupport: false,
    },
    [AuthErrorType.TIMEOUT]: {
      title: 'Request Timeout',
      message: error.message,
      action: 'Retry',
      variant: 'warning',
      showRetry: true,
      showSupport: false,
    },
    [AuthErrorType.SERVER_ERROR]: {
      title: 'Server Error',
      message: error.message,
      action: 'Retry',
      variant: 'error',
      showRetry: true,
      showSupport: true,
    },
    [AuthErrorType.INVALID_EMAIL]: {
      title: 'Invalid Email',
      message: error.message,
      action: 'Correct Email',
      variant: 'error',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.INVALID_PASSWORD]: {
      title: 'Invalid Password',
      message: error.message,
      action: 'Correct Password',
      variant: 'error',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.INVALID_ROLE]: {
      title: 'Invalid Role',
      message: error.message,
      action: 'Contact Support',
      variant: 'error',
      showRetry: false,
      showSupport: true,
    },
    [AuthErrorType.SYNC_FAILED]: {
      title: 'Sync Failed',
      message: error.message,
      action: 'Retry',
      variant: 'error',
      showRetry: true,
      showSupport: true,
    },
    [AuthErrorType.UNAUTHORIZED]: {
      title: 'Unauthorized',
      message: error.message,
      action: 'Sign In',
      variant: 'error',
      showRetry: false,
      showSupport: false,
    },
    [AuthErrorType.UNKNOWN_ERROR]: {
      title: 'Unexpected Error',
      message: error.message,
      action: 'Retry',
      variant: 'error',
      showRetry: true,
      showSupport: true,
    },
  };

  return baseInfo[error.type] || baseInfo[AuthErrorType.UNKNOWN_ERROR];
};
