import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useUser, useAuth, ClerkProvider } from '@clerk/clerk-react';
import { User } from '../types';
import { API_ENDPOINTS } from '../services/api-endpoints';
import { apiService, ApiError } from '../services/api';
import { authDebugger } from '../src/utils/authDebugger';

const BACKEND_SYNC_ERROR_KEY = 'common:loginPage.backendSyncError';
const BACKEND_USER_CREATION_ERROR_KEY = 'common:loginPage.backendUserCreationError';
const WEBHOOK_RETRY_ATTEMPTS = 2;
const WEBHOOK_RETRY_DELAY_MS = 2000;
const SYNC_RETRY_DELAY_MS = 5000;

interface SyncAttemptState {
  clerkId: string | null;
  status: 'idle' | 'success' | 'error';
  lastAttempt: number;
  lastErrorStatus?: number;
  lastErrorMessage?: string;
}

const INITIAL_SYNC_STATE: SyncAttemptState = {
  clerkId: null,
  status: 'idle',
  lastAttempt: 0,
};

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  signup: (formData: any, role: any) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  updateCurrentUserInfo: (updatedInfo: Partial<User>) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const { getToken, signOut: clerkSignOut, isSignedIn } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncAttemptRef = useRef<SyncAttemptState>(INITIAL_SYNC_STATE);
  const syncInFlightRef = useRef(false);

  const clerkUserId = clerkUser?.id ?? null;
  const isAuthenticated = Boolean(clerkUser && isSignedIn);

  // Log Clerk SDK init
  useEffect(() => {
    if (clerkIsLoaded) {
      authDebugger.log('CLERK', 'sdk_init', 'OK', '');
    }
  }, [clerkIsLoaded]);

  const transformBackendUser = useCallback((user: any): User => {
    console.log('🔄 Transforming backend user:', user);
    
    const transformed = {
      ...user,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || user.lastName || 'Unknown User',
      status: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastActiveAt,
      memberSince: user.createdAt,
    };
    
    console.log('✅ Transformed user:', transformed);
    return transformed;
  }, []);

  const determineAuthErrorKey = useCallback((error: unknown): string => {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return BACKEND_USER_CREATION_ERROR_KEY;
      }
      return BACKEND_SYNC_ERROR_KEY;
    }

    if (error instanceof Error && error.message === BACKEND_USER_CREATION_ERROR_KEY) {
      return BACKEND_USER_CREATION_ERROR_KEY;
    }

    return BACKEND_SYNC_ERROR_KEY;
  }, []);

  const fetchUserFromBackend = useCallback(
    async (clerkId: string, attempt = 0): Promise<User> => {
      const token = await getToken();

      console.group(`🔄 [BACKEND SYNC] Attempt ${attempt + 1}/${WEBHOOK_RETRY_ATTEMPTS + 1}`);
      
      if (!token) {
        console.error('❌ No authentication token available');
        console.groupEnd();
        authDebugger.log('HTTP', 'req', 'ERROR', { url: '/api/users/me', error: 'no_token' });
        throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
      }

      const apiBaseUrl = apiService.apiBaseUrl;
      const url = `${apiBaseUrl}${API_ENDPOINTS.users.me}`;

      // Enhanced environment diagnostics
      const envConfig = {
        rawApiUrl: import.meta.env.VITE_API_URL,
        computedBaseUrl: apiBaseUrl,
        fullRequestUrl: url,
        nodeEnv: import.meta.env.NODE_ENV,
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD,
      };

      console.log('🔧 Environment Config:', envConfig);
      authDebugger.log('ENV', 'config', 'INFO', envConfig);

      // Token validation
      const tokenInfo = {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 20) + '...',
        tokenType: typeof token,
        isValidFormat: token?.startsWith('eyJ') || false, // JWT tokens start with eyJ
      };

      console.log('🔑 Token Info:', tokenInfo);
      authDebugger.log('TOKEN', 'validate', 'INFO', tokenInfo);

      console.log('📤 Request Details:', {
        url,
        method: 'GET',
        clerkId,
        tokenPrefix: token.substring(0, 20) + '...',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + token.substring(0, 20) + '...',
        }
      });

      // Log HTTP request with full details
      authDebugger.log('HTTP', 'req', 'INFO', { 
        method: 'GET', 
        url: '/api/users/me',
        fullUrl: url,
        authHeader: true,
        attempt: attempt + 1,
        timestamp: new Date().toISOString()
      });

      let response: Response;
      const fetchStartTime = performance.now();
      
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const fetchEndTime = performance.now();
        const duration = fetchEndTime - fetchStartTime;

        // Extract all CORS headers
        const corsHeaders = {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
          'access-control-expose-headers': response.headers.get('access-control-expose-headers'),
        };

        console.log('📥 Response Status:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          type: response.type,
          redirected: response.redirected,
          url: response.url,
          duration: `${duration.toFixed(2)}ms`,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
            'server': response.headers.get('server'),
            ...corsHeaders,
          }
        });

        // Log HTTP response with detailed info
        if (response.ok) {
          authDebugger.log('HTTP', 'res', 'OK', { 
            status: response.status,
            category: 'OK',
            duration: `${duration.toFixed(2)}ms`,
            cors: corsHeaders
          });
        } else if (response.status === 401 || response.status === 403) {
          authDebugger.log('HTTP', 'res', 'ERROR', { 
            status: response.status,
            category: 'UNAUTH',
            duration: `${duration.toFixed(2)}ms`
          });
        } else if (response.status === 0) {
          authDebugger.log('HTTP', 'res', 'ERROR', { 
            status: 0,
            category: 'NETWORK',
            duration: `${duration.toFixed(2)}ms`
          });
        } else {
          authDebugger.log('HTTP', 'res', 'ERROR', { 
            status: response.status,
            category: 'HTTP_ERROR',
            duration: `${duration.toFixed(2)}ms`
          });
        }
      } catch (fetchError) {
        const fetchEndTime = performance.now();
        const duration = fetchEndTime - fetchStartTime;

        // Enhanced error diagnostics
        const errorDetails = {
          errorName: fetchError instanceof Error ? fetchError.name : 'Unknown',
          errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
          errorStack: fetchError instanceof Error ? fetchError.stack : undefined,
          duration: `${duration.toFixed(2)}ms`,
          url: url,
          apiBaseUrl: apiBaseUrl,
          timestamp: new Date().toISOString(),
          // Browser/Network diagnostics
          online: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          userAgent: navigator.userAgent,
          // URL parsing
          urlParts: {
            protocol: new URL(url).protocol,
            hostname: new URL(url).hostname,
            port: new URL(url).port,
            pathname: new URL(url).pathname,
          },
        };

        console.error('❌ Network/Fetch Error - DETAILED DIAGNOSTICS:', errorDetails);
        console.groupEnd();
        
        authDebugger.log('HTTP', 'res', 'ERROR', { 
          status: 0,
          category: 'NETWORK',
          error: String(fetchError),
          details: errorDetails
        });
        
        throw new ApiError(
          `Network error: ${errorDetails.errorMessage}. URL: ${url}. Online: ${errorDetails.online}`,
          0,
          'network_error'
        );
      }

      // Try to get response body for debugging (DO THIS FIRST before any other checks)
      let responseBody: any;
      let responseText: string = '';
      try {
        responseText = await response.text(); // Don't use clone(), just read it once
        console.log('📄 Response Body (raw):', responseText);
        
        // Log response body for debugging
        authDebugger.log('HTTP', 'body_raw', 'INFO', { 
          length: responseText.length,
          preview: responseText.substring(0, 200)
        });
        
        try {
          responseBody = JSON.parse(responseText);
          console.log('📄 Response Body (parsed):', responseBody);
          
          // Log parsed response structure
          authDebugger.log('HTTP', 'body_parsed', 'INFO', {
            hasSuccess: !!responseBody?.success,
            successValue: responseBody?.success,
            hasData: !!responseBody?.data,
            dataKeys: responseBody?.data ? Object.keys(responseBody.data).join(',') : 'none',
            isPending: responseBody?.data?.isPending || false
          });
        } catch (parseError) {
          console.warn('⚠️  Response is not valid JSON:', parseError);
          authDebugger.log('HTTP', 'parse_error', 'ERROR', { 
            error: String(parseError)
          });
        }
      } catch (bodyError) {
        console.error('❌ Error reading response body:', bodyError);
        authDebugger.log('HTTP', 'read_error', 'ERROR', { 
          error: String(bodyError)
        });
      }

      if (response.status === 404 && attempt < WEBHOOK_RETRY_ATTEMPTS) {
        console.warn('⏳ User not found (404). Waiting for webhook to create user...', {
          attempt: attempt + 1,
          maxAttempts: WEBHOOK_RETRY_ATTEMPTS,
          waitTime: WEBHOOK_RETRY_DELAY_MS + 'ms',
          clerkId,
        });
        console.groupEnd();
        await new Promise(resolve => setTimeout(resolve, WEBHOOK_RETRY_DELAY_MS));
        return fetchUserFromBackend(clerkId, attempt + 1);
      }

      if (!response.ok) {
        console.error('❌ Backend returned error:', {
          status: response.status,
          statusText: response.statusText,
          body: responseBody || responseText,
        });
        console.groupEnd();
        throw new ApiError(
          responseBody?.message || `Failed to fetch user: ${response.statusText}`, 
          response.status,
          responseBody?.code || 'backend_error'
        );
      }

      // Now we have the parsed responseBody, use it
      const data = responseBody;

      // Handle pending user case (200 response with isPending: true)
      if (data?.success && data?.data?.isPending) {
        console.warn('⏳ User is pending webhook processing. Retrying...', {
          attempt: attempt + 1,
          maxAttempts: WEBHOOK_RETRY_ATTEMPTS,
          waitTime: WEBHOOK_RETRY_DELAY_MS + 'ms',
          clerkId,
          message: data.data.message,
        });
        authDebugger.log('HTTP', 'user_pending', 'INFO', {
          attempt: attempt + 1,
          message: data.data.message
        });
        console.groupEnd();
        
        if (attempt < WEBHOOK_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, WEBHOOK_RETRY_DELAY_MS));
          return fetchUserFromBackend(clerkId, attempt + 1);
        } else {
          throw new ApiError(
            data.data.message || 'User account is being processed. Please wait a moment and refresh.',
            202, // 202 Accepted - processing
            'user_pending'
          );
        }
      }

      if (!data?.success || !data?.data) {
        console.error('❌ Invalid response format:', {
          hasSuccess: !!data?.success,
          successValue: data?.success,
          hasData: !!data?.data,
          dataValue: data?.data,
          fullResponse: data,
        });
        authDebugger.log('HTTP', 'invalid_format', 'ERROR', {
          hasSuccess: !!data?.success,
          successValue: data?.success,
          hasData: !!data?.data,
          responseType: typeof data,
          responseKeys: data ? Object.keys(data).join(',') : 'null'
        });
        console.groupEnd();
        throw new Error('Invalid response format from backend');
      }

      console.log('✅ User synced successfully:', {
        userId: data.data.id,
        email: data.data.email,
        role: data.data.role,
        firstName: data.data.firstName,
        lastName: data.data.lastName,
      });
      
      authDebugger.log('HTTP', 'user_sync_success', 'OK', {
        userId: data.data.id,
        email: data.data.email,
        role: data.data.role,
        hasFirstName: !!data.data.firstName,
        hasLastName: !!data.data.lastName
      });
      
      console.groupEnd();

      return transformBackendUser(data.data);
    },
    [getToken, transformBackendUser]
  );

  useEffect(() => {
    if (!clerkIsLoaded) {
      setIsLoading(true);
      return;
    }

    if (!isSignedIn || !clerkUserId) {
      setCurrentUser(null);
      setAuthError(null);
      syncAttemptRef.current = INITIAL_SYNC_STATE;
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    const lastSync = syncAttemptRef.current;

    if (lastSync.clerkId === clerkUserId && lastSync.status === 'success') {
      setIsLoading(false);
      return;
    }

    if (
      lastSync.clerkId === clerkUserId &&
      lastSync.status === 'error' &&
      now - lastSync.lastAttempt < SYNC_RETRY_DELAY_MS
    ) {
      setIsLoading(false);
      return;
    }

    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    let cancelled = false;

    const runSync = async () => {
      setIsLoading(true);
      
      console.log('🔄 [SYNC] Starting user sync...', { clerkUserId });
      authDebugger.log('SYNC', 'start', 'INFO', { clerkUserId });

      try {
        const backendUser = await fetchUserFromBackend(clerkUserId);
        if (cancelled) {
          console.log('⚠️  [SYNC] Sync cancelled');
          authDebugger.log('SYNC', 'cancelled', 'INFO', { reason: 'component_unmounted' });
          return;
        }

        console.log('✅ [SYNC] Setting user state:', {
          userId: backendUser.id,
          email: backendUser.email,
          role: backendUser.role,
          name: backendUser.name
        });
        
        authDebugger.log('SYNC', 'set_user', 'OK', {
          userId: backendUser.id,
          email: backendUser.email,
          role: backendUser.role
        });

        setCurrentUser(backendUser);
        setAuthError(null);
        syncAttemptRef.current = {
          clerkId: clerkUserId,
          status: 'success',
          lastAttempt: Date.now(),
        };
        
        console.log('✅ [SYNC] User state updated successfully');
        authDebugger.log('SYNC', 'complete', 'OK', { status: 'success' });
      } catch (error) {
        if (cancelled) {
          console.log('⚠️  [SYNC] Sync cancelled during error handling');
          return;
        }

        console.error('❌ [SYNC] Failed to sync user with backend:', error);
        const errorKey = determineAuthErrorKey(error);
        setCurrentUser(null);
        setAuthError(errorKey);
        
        authDebugger.log('SYNC', 'error', 'ERROR', {
          errorKey,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStatus: error instanceof ApiError ? error.status : undefined
        });

        syncAttemptRef.current = {
          clerkId: clerkUserId,
          status: 'error',
          lastAttempt: Date.now(),
          lastErrorStatus: error instanceof ApiError ? error.status : undefined,
          lastErrorMessage: error instanceof Error ? error.message : String(error),
        };

        const logContext = {
          clerkId: clerkUserId,
          status: error instanceof ApiError ? error.status : undefined,
          message: error instanceof Error ? error.message : String(error),
        };

        if (errorKey === BACKEND_USER_CREATION_ERROR_KEY) {
          console.error('User still not found after webhook wait. Backend webhook may not be configured.', logContext);
        } else {
          console.error('Unable to load user profile. Backend connection required.', logContext);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
        syncInFlightRef.current = false;
      }
    };

    runSync();

    return () => {
      cancelled = true;
    };
  }, [clerkIsLoaded, clerkUserId, isSignedIn, fetchUserFromBackend, determineAuthErrorKey]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    // Clerk handles authentication, this is just for compatibility
    setAuthError(null);
    return { success: true };
  };

  const logout = useCallback(async () => {
    try {
      // Clear local user state first
      setCurrentUser(null);
      setAuthError(null);
      syncAttemptRef.current = INITIAL_SYNC_STATE;

      // Properly sign out from Clerk
      await clerkSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Clerk signOut fails
      setCurrentUser(null);
    }
  }, [clerkSignOut]);

  const signup = async (formData: any, role: any): Promise<{ success: boolean; message?: string; redirectTo?: string }> => {
    // Clerk handles signup, this is just for compatibility
    return { success: true };
  };

  const updateCurrentUserInfo = useCallback(
    async (updatedInfo: Partial<User>) => {
      console.group('🔄 [UPDATE USER] Starting update');
      console.log('📝 Data to update:', updatedInfo);
      
      if (!currentUser) {
        console.error('❌ No current user - cannot update');
        console.groupEnd();
        return;
      }

      try {
        const token = await getToken();
        console.log('🔑 Token obtained:', token ? 'YES' : 'NO');

        if (!token) {
          console.error('❌ No authentication token');
          console.groupEnd();
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        // Prepare data for backend (remove frontend-only fields)
        const backendData: any = { ...updatedInfo };
        
        // Remove frontend-only fields that backend doesn't accept
        delete backendData.name; // We use firstName/lastName separately
        delete backendData.orgName; // Backend uses orgId (UUID), not orgName (string)
        delete backendData.status; // Transformed field, not raw backend field
        delete backendData.lastLogin; // Transformed field
        delete backendData.memberSince; // Transformed field
        delete backendData.organizations; // Many-to-many relation, not direct field
        
        console.log('🔄 Prepared data for backend:', backendData);

        const apiBaseUrl = apiService.apiBaseUrl;
        const url = `${apiBaseUrl}${API_ENDPOINTS.users.update}`;

        console.log('📤 Making PATCH request:', {
          url,
          method: 'PATCH',
          body: backendData,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + token.substring(0, 20) + '...',
          }
        });

        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(backendData),
        });

        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          }
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('❌ Update failed:', {
            status: response.status,
            body: errorBody,
          });
          console.groupEnd();
          throw new ApiError('Failed to update user', response.status);
        }

        const data = await response.json();
        console.log('📄 Update response:', data);
        
        if (data?.success && data?.data) {
          const transformedUser = transformBackendUser(data.data);
          setCurrentUser(transformedUser);
          setAuthError(null);
          if (clerkUserId) {
            syncAttemptRef.current = {
              clerkId: clerkUserId,
              status: 'success',
              lastAttempt: Date.now(),
            };
          }
          console.log('✅ User updated successfully');
          console.groupEnd();
        } else {
          console.error('❌ Invalid response format:', data);
          console.groupEnd();
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('❌ Failed to update user:', error);
        console.groupEnd();
        throw error;
      }
    },
    [currentUser, getToken, transformBackendUser, clerkUserId]
  );

  const refreshCurrentUser = useCallback(async () => {
    if (!clerkIsLoaded) {
      throw new Error('Clerk is not loaded yet');
    }

    if (!clerkUserId) {
      throw new Error('No authenticated user to refresh');
    }

    const backendUser = await fetchUserFromBackend(clerkUserId);
    setCurrentUser(backendUser);
    setAuthError(null);
    syncAttemptRef.current = {
      clerkId: clerkUserId,
      status: 'success',
      lastAttempt: Date.now(),
    };
  }, [clerkIsLoaded, clerkUserId, fetchUserFromBackend]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoading,
        isAuthenticated,
        authError,
        clearAuthError: () => setAuthError(null),
        login,
        logout,
        signup,
        updateCurrentUserInfo,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      'VITE_CLERK_PUBLISHABLE_KEY is required. Please set up Clerk authentication in your environment variables.'
    );
  }

  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      afterSignOutUrl="/login"
      appearance={{
        elements: {
          // Disable Clerk's built-in CAPTCHA since we're using hCaptcha
          captcha: {
            display: 'none'
          }
        }
      }}
    >
      <AuthProviderInner>{children}</AuthProviderInner>
    </ClerkProvider>
  );
};

// MockAuthProvider removed for production - Clerk authentication required

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
