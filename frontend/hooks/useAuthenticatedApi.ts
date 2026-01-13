import { useAuth } from '@clerk/clerk-react';
import { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService, ApiResponse, ApiError } from '../services/api';

export function useAuthenticatedApi() {
  const { getToken } = useAuth();
  const { t } = useTranslation('common');
  
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
          // Avoid browser HTTP caching/conditional requests (304 has no body, and these
          // endpoints are auth-protected + user-specific anyway).
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const resolvedMessage =
            typeof (errorData as any)?.message === 'string'
              ? (errorData as any).message
              : typeof (errorData as any)?.error === 'string'
                ? (errorData as any).error
                : `HTTP ${response.status}: ${response.statusText}`;
          throw new ApiError(
            resolvedMessage,
            response.status,
            (errorData as any)?.code
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

        // Determine the download URL based on the input format
        let downloadUrl: string;
        const apiUrl = apiService.apiBaseUrl; // e.g., "http://localhost:3000/api"

        if (fileUrl.startsWith('/api/upload/download/')) {
          // Already a secure download URL (relative path like /api/upload/download/...)
          // Extract the storage key (everything after /api/upload/download/)
          const storageKey = fileUrl.substring('/api/upload/download/'.length);
          // Construct URL: apiUrl is already "http://localhost:3000/api", so just add /upload/download/
          downloadUrl = `${apiUrl}/upload/download/${storageKey}`;
        } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
          // Full URL - extract storage key
          try {
            const url = new URL(fileUrl);
            // Check if it's already a download URL
            if (url.pathname.startsWith('/api/upload/download/')) {
              const storageKey = url.pathname.substring('/api/upload/download/'.length);
              downloadUrl = `${apiUrl}/upload/download/${storageKey}`;
            } else {
              // Extract storage key from pathname
              const storageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
              downloadUrl = `${apiUrl}/upload/download/${storageKey}`;
            }
          } catch {
            // If URL parsing fails, try to extract from path
            const pathMatch = fileUrl.match(/\/upload\/download\/(.+)$/);
            if (pathMatch) {
              downloadUrl = `${apiUrl}/upload/download/${pathMatch[1]}`;
            } else {
              throw new ApiError('Invalid file URL format', 400);
            }
          }
        } else {
          // Assume it's a storage key (e.g., "messages/...")
          downloadUrl = `${apiUrl}/upload/download/${fileUrl}`;
        }

        // Fetch through proxy with authentication
        const response = await fetch(downloadUrl, {
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
          error instanceof Error ? error.message : t('common:errors.downloadFailed'),
          0
        );
      }
    },
    [t] // Only t in deps - getToken accessed via ref for stability
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
