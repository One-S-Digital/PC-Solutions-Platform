import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';
import { apiService, ApiResponse, ApiError } from '../services/api';

export function useAuthenticatedApi() {
  const { getToken } = useAuth();

  const getTokenWithRetry = useCallback(async (): Promise<string> => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const token = await getToken();
        if (token) {
          return token;
        }
      } catch (error) {
        lastError = error;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.error('Failed to obtain Clerk token for authenticated request', lastError);
    throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
  }, [getToken]);

  const authenticatedRequest = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      try {
        const token = await getTokenWithRetry();

        if (!token) {
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        const url = `${apiService.apiBaseUrl}${endpoint}`;

        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code
          );
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          0
        );
      }
    },
    [getTokenWithRetry]
  );

  const authenticatedUpload = useCallback(
    async (
      endpoint: string,
      file: File,
      additionalData?: Record<string, any>
    ): Promise<ApiResponse> => {
      try {
        const token = await getTokenWithRetry();

        if (!token) {
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        const url = `${apiService.apiBaseUrl}${endpoint}`;
        const formData = new FormData();
        formData.append('file', file);

        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code
          );
        }

        return response.json();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          0
        );
      }
    },
    [getTokenWithRetry]
  );

  return {
    request: authenticatedRequest,
    upload: authenticatedUpload,
  };
}
