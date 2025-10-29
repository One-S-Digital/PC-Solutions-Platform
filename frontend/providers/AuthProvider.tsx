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

const BACKEND_SYNC_ERROR_KEY = 'common:loginPage.backendSyncError';
const BACKEND_USER_CREATION_ERROR_KEY = 'common:loginPage.backendUserCreationError';
const WEBHOOK_RETRY_ATTEMPTS = 2;
const WEBHOOK_RETRY_DELAY_MS = 2000;
const SYNC_RETRY_DELAY_MS = 5000;
const TOKEN_RETRY_ATTEMPTS = 10;
const TOKEN_RETRY_DELAY_MS = 200;

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

  const getTokenWithRetry = useCallback(async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < TOKEN_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const token = await getToken();
        if (token) {
          if (attempt > 0) {
            console.log(
              `🔑 Obtained Clerk token after ${attempt + 1} attempts (${(attempt + 1) * TOKEN_RETRY_DELAY_MS}ms)`
            );
          }
          return token;
        }
      } catch (error) {
        lastError = error;
        console.warn('⚠️  Failed to fetch Clerk token on attempt', attempt + 1, error);
      }

      await new Promise(resolve => setTimeout(resolve, TOKEN_RETRY_DELAY_MS));
    }

    console.error('❌ Unable to obtain Clerk token after retries', lastError);
    throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
  }, [getToken]);

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
      const token = await getTokenWithRetry();

      console.group(`🔄 [BACKEND SYNC] Attempt ${attempt + 1}/${WEBHOOK_RETRY_ATTEMPTS + 1}`);
      
      if (!token) {
        console.error('❌ No authentication token available');
        console.groupEnd();
        throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
      }

      const apiBaseUrl = apiService.apiBaseUrl;
      const url = `${apiBaseUrl}${API_ENDPOINTS.users.me}`;

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

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('📥 Response Status:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          }
        });
      } catch (fetchError) {
        console.error('❌ Network/Fetch Error:', fetchError);
        console.groupEnd();
        throw new ApiError('Network error during fetch', 0, 'network_error');
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

      // Try to get response body for debugging
      let responseBody: any;
      let responseText: string = '';
      try {
        responseText = await response.clone().text();
        console.log('📄 Response Body (raw):', responseText);
        
        try {
          responseBody = JSON.parse(responseText);
          console.log('📄 Response Body (parsed):', responseBody);
        } catch (parseError) {
          console.warn('⚠️  Response is not valid JSON:', parseError);
        }
      } catch (bodyError) {
        console.error('❌ Error reading response body:', bodyError);
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

      const data = responseBody || await response.json();

      if (!data?.success || !data?.data) {
        console.error('❌ Invalid response format:', {
          hasSuccess: !!data?.success,
          hasData: !!data?.data,
          fullResponse: data,
        });
        console.groupEnd();
        throw new Error('Invalid response format from backend');
      }

      console.log('✅ User synced successfully:', {
        userId: data.data.id,
        email: data.data.email,
        role: data.data.role,
      });
      console.groupEnd();

      return transformBackendUser(data.data);
    },
    [getTokenWithRetry, transformBackendUser]
  );

  const triggerBackendUserSync = useCallback(
    async () => {
      const token = await getTokenWithRetry();

      if (!token) {
        throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
      }

      const apiBaseUrl = apiService.apiBaseUrl;
      const url = `${apiBaseUrl}${API_ENDPOINTS.users.sync}`;

      console.group('🔄 [BACKEND SYNC] Triggering manual user sync');
      console.log('📤 Request Details:', { url, method: 'POST' });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(error => {
        console.error('❌ Network error during manual sync:', error);
        console.groupEnd();
        throw new ApiError('Network error during manual sync', 0, 'network_error');
      });

      console.log('📥 Sync Response Status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('❌ Manual sync failed:', { status: response.status, body: bodyText });
        console.groupEnd();
        throw new ApiError(bodyText || 'Failed to sync user with backend', response.status, 'backend_sync_failed');
      }

      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch (parseError) {
        // Some responses may not include a body; treat as success.
        console.warn('⚠️ Manual sync response was not JSON. Proceeding anyway.', parseError);
      }

      if (responseJson?.success) {
        console.log('✅ Manual sync succeeded:', {
          userId: responseJson.data?.id,
          role: responseJson.data?.role,
        });
      } else {
        console.warn('⚠️ Manual sync completed without success flag:', responseJson);
      }

      console.groupEnd();
    },
    [getTokenWithRetry]
  );

  const syncAndFetchBackendUser = useCallback(async (): Promise<User> => {
    if (!clerkUserId) {
      throw new Error('No authenticated user to load');
    }

    try {
      return await fetchUserFromBackend(clerkUserId);
    } catch (error) {
      const isMissingUser =
        (error instanceof ApiError && error.status === 404) ||
        (error instanceof Error && error.message === 'Invalid response format from backend');

      if (!isMissingUser) {
        throw error;
      }

      console.warn('⚠️ Backend user missing, attempting manual sync...');
      await triggerBackendUserSync();
      return fetchUserFromBackend(clerkUserId);
    }
  }, [clerkUserId, fetchUserFromBackend, triggerBackendUserSync]);

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

      try {
        const backendUser = await syncAndFetchBackendUser();
        if (cancelled) {
          return;
        }

        setCurrentUser(backendUser);
        setAuthError(null);
        syncAttemptRef.current = {
          clerkId: clerkUserId,
          status: 'success',
          lastAttempt: Date.now(),
        };
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('Failed to sync user with backend:', error);
        const errorKey = determineAuthErrorKey(error);
        setCurrentUser(null);
        setAuthError(errorKey);

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
  }, [clerkIsLoaded, clerkUserId, isSignedIn, syncAndFetchBackendUser, determineAuthErrorKey]);

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
        const token = await getTokenWithRetry();
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
    [currentUser, getTokenWithRetry, transformBackendUser, clerkUserId]
  );

  const refreshCurrentUser = useCallback(async () => {
    if (!clerkIsLoaded) {
      throw new Error('Clerk is not loaded yet');
    }

    if (!clerkUserId) {
      throw new Error('No authenticated user to refresh');
    }

    const backendUser = await syncAndFetchBackendUser();
    setCurrentUser(backendUser);
    setAuthError(null);
    syncAttemptRef.current = {
      clerkId: clerkUserId,
      status: 'success',
      lastAttempt: Date.now(),
    };
  }, [clerkIsLoaded, clerkUserId, syncAndFetchBackendUser]);

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
