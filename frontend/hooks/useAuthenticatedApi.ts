import { useAuth } from '@clerk/clerk-react';
import { useCallback, useRef, useEffect } from 'react';
import { apiService, ApiResponse, ApiError } from '../services/api';

export function useAuthenticatedApi() {
  const { getToken } = useAuth();
  
  // Use a ref to hold the latest getToken function to avoid dependency array issues.
  // Clerk's getToken is not referentially stable and can cause infinite loops
  // when included in useCallback dependency arrays.
  const getTokenRef = useRef(getToken);
  
  // Keep the ref updated with the latest getToken function
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const authenticatedRequest = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      try {
        const token = await getTokenRef.current();

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
    [] // Empty deps - getToken accessed via ref for stability
  );

  const authenticatedUpload = useCallback(
    async (
      endpoint: string,
      file: File,
      additionalData?: Record<string, any>
    ): Promise<ApiResponse> => {
      try {
        const token = await getTokenRef.current();

        if (!token) {
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        const url = `${apiService.apiBaseUrl}${endpoint}`;
        const formData = new FormData();
        formData.append('file', file);

        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              return; // Skip undefined/null values
            }
            
            // Serialize arrays and objects as JSON
            if (Array.isArray(value) || (typeof value === 'object' && !(value instanceof Date))) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
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
    [] // Empty deps - getToken accessed via ref for stability
  );

  // Wrapper to accept a callback that returns a Promise (for apiService methods)
  const makeAuthenticatedRequest = useCallback(
    async <T = any>(
      apiCall: () => Promise<ApiResponse<T>>
    ): Promise<ApiResponse<T>> => {
      try {
        const token = await getTokenRef.current();
        
        if (!token) {
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        // The apiService methods don't automatically add auth headers
        // So we need to ensure the token is available for fetch calls
        // For now, just execute the API call (apiService methods use fetch internally)
        return await apiCall();
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
    [] // Empty deps - getToken accessed via ref for stability
  );

  const authenticatedDownload = useCallback(
    async (fileUrl: string, fileName: string): Promise<void> => {
      try {
        const token = await getTokenRef.current();

        if (!token) {
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        // Extract storage key from the URL
        const url = new URL(fileUrl);
        const storageKey = url.pathname.substring(1); // Remove leading slash

        // Use backend proxy endpoint
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const proxyUrl = `${apiUrl}/upload/download/${storageKey}`;

        // Fetch through proxy with authentication
        const response = await fetch(proxyUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new ApiError(`Download failed: ${response.statusText}`, response.status);
        }

        // Convert to blob and download
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(
          error instanceof Error ? error.message : 'Download failed',
          0
        );
      }
    },
    [] // Empty deps - getToken accessed via ref for stability
  );

  return {
    // Legacy names for backward compatibility
    request: authenticatedRequest,
    upload: authenticatedUpload,
    // New names that match the page usage
    authenticatedRequest,
    authenticatedUpload,
    authenticatedDownload,
    makeAuthenticatedRequest,
  };
}
