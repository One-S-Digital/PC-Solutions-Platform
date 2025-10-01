import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ApiError } from '../services/api';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: Error | ApiError | any,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    // Extract error message
    let message = fallbackMessage;
    let status: number | undefined;
    let code: string | undefined;

    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === 'object') {
      message = error.message || error.error || fallbackMessage;
      status = error.status;
      code = error.code;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Log error for debugging
    if (logError) {
      console.error('Error handled by useErrorHandler:', {
        message,
        status,
        code,
        error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }

    // Show toast notification
    if (showToast) {
      toast.error(message);
    }

    return {
      message,
      status,
      code,
      originalError: error,
    };
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  const handleFormError = useCallback((
    error: Error | ApiError | any,
    fieldErrors?: Record<string, string>
  ) => {
    const { message, status, code } = handleError(error, { showToast: false });

    // Handle validation errors
    if (status === 422 && fieldErrors) {
      Object.entries(fieldErrors).forEach(([field, fieldMessage]) => {
        toast.error(`${field}: ${fieldMessage}`);
      });
    } else {
      toast.error(message);
    }

    return {
      message,
      status,
      code,
      fieldErrors,
    };
  }, [handleError]);

  const handleNetworkError = useCallback((error: any) => {
    const message = 'Network error. Please check your connection and try again.';
    
    console.error('Network error:', error);
    toast.error(message);

    return {
      message,
      isNetworkError: true,
      originalError: error,
    };
  }, []);

  const handleAuthError = useCallback((error: any) => {
    const message = 'Authentication failed. Please log in again.';
    
    console.error('Authentication error:', error);
    toast.error(message);

    // Clear auth token and redirect to login
    localStorage.removeItem('auth_token');
    window.location.href = '/login';

    return {
      message,
      isAuthError: true,
      originalError: error,
    };
  }, []);

  const handleValidationError = useCallback((
    error: any,
    validationErrors?: Array<{ field: string; message: string }>
  ) => {
    let message = 'Validation failed. Please check your input.';

    if (validationErrors && validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => `${err.field}: ${err.message}`);
      message = `Validation failed: ${errorMessages.join(', ')}`;
    } else if (error?.message) {
      message = error.message;
    }

    console.error('Validation error:', error);
    toast.error(message);

    return {
      message,
      validationErrors,
      isValidationError: true,
      originalError: error,
    };
  }, []);

  return {
    handleError,
    handleAsyncError,
    handleFormError,
    handleNetworkError,
    handleAuthError,
    handleValidationError,
  };
};

export default useErrorHandler;