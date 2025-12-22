import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useUser, useAuth, ClerkProvider, useClerk } from '@clerk/clerk-react';
import { Organization, User, UserRole } from '../types';
import { API_ENDPOINTS } from '../services/api-endpoints';
import { apiService, ApiError } from '../services/api';

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
  isSigningOut: boolean;
  clearAuthError: () => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  signup: (formData: any, role: any) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  updateCurrentUserInfo: (updatedInfo: Partial<User>) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  verifyEmailChange: (code: string, emailAddressId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const { getToken, signOut: clerkSignOut, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const syncAttemptRef = useRef<SyncAttemptState>(INITIAL_SYNC_STATE);
  const syncInFlightRef = useRef(false);

  const clerkUserId = clerkUser?.id ?? null;
  const isAuthenticated = Boolean(clerkUser && isSignedIn);

    const transformBackendUser = useCallback((user: any): User => {
      const normalizedOrganizations: Array<Organization & { membershipRole?: UserRole }> = Array.isArray(user.organizations)
        ? user.organizations.map((entry: any) => {
            const organization = entry?.organization ?? entry ?? {};
            const products = Array.isArray(organization.products) ? organization.products : [];
            const services = Array.isArray(organization.services) ? organization.services : [];
            const jobListings = Array.isArray(organization.jobListings) ? organization.jobListings : [];
            const logoUrl = organization.logoUrl ?? organization.logoAsset?.publicUrl ?? null;
            const coverImageUrl = organization.coverImageUrl ?? organization.coverAsset?.publicUrl ?? null;

            return {
              ...organization,
              products,
              services,
              jobListings,
              logoUrl,
              coverImageUrl,
              membershipRole: entry?.membershipRole ?? entry?.role,
            };
          })
        : [];

      const rawPrimary =
        user.primaryOrganization?.organization ??
        user.primaryOrganization ??
        normalizedOrganizations[0] ??
        null;

      const primaryOrganization = rawPrimary
        ? {
            ...rawPrimary,
            products: Array.isArray(rawPrimary.products) ? rawPrimary.products : [],
            services: Array.isArray(rawPrimary.services) ? rawPrimary.services : [],
            jobListings: Array.isArray(rawPrimary.jobListings) ? rawPrimary.jobListings : [],
            logoUrl: rawPrimary.logoUrl ?? rawPrimary.logoAsset?.publicUrl ?? null,
            coverImageUrl: rawPrimary.coverImageUrl ?? rawPrimary.coverAsset?.publicUrl ?? null,
            membershipRole:
              rawPrimary.membershipRole ??
              user.primaryOrganization?.membershipRole ??
              rawPrimary.role,
          }
        : null;

      const derivedName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.lastName || user.name || user.email || 'Unknown User';

      const resolvedAvatar =
        user.avatarAsset?.publicUrl ??
        user.avatarUrl ??
        primaryOrganization?.logoUrl ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName)}&background=48CFAE&color=ffffff&size=128&rounded=true`;

      return {
        ...user,
        name: derivedName,
        status: user.isActive ? 'Active' : 'Inactive',
        lastLogin: user.lastActiveAt,
        memberSince: user.createdAt,
        avatarUrl: resolvedAvatar,
        orgId: user.orgId ?? primaryOrganization?.id,
        orgName: user.orgName ?? primaryOrganization?.name,
        orgType: user.orgType ?? primaryOrganization?.type,
        orgLogoUrl: user.orgLogoUrl ?? primaryOrganization?.logoUrl ?? null,
        orgCoverImageUrl: user.orgCoverImageUrl ?? primaryOrganization?.coverImageUrl ?? null,
        organizations: normalizedOrganizations,
        primaryOrganization,
      };
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

      
      if (!token) {
        console.error('Authentication token not available');
        throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
      }

      const apiBaseUrl = apiService.apiBaseUrl;
      const url = `${apiBaseUrl}${API_ENDPOINTS.users.me}`;

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

        console.error('Network request failed while fetching user data', errorDetails);
        
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
        
        try {
          responseBody = JSON.parse(responseText);
          
        } catch (parseError) {
        }
      } catch (bodyError) {
        console.error('Failed to read response body:', bodyError);
      }

      if (response.status === 404 && attempt < WEBHOOK_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, WEBHOOK_RETRY_DELAY_MS));
        return fetchUserFromBackend(clerkId, attempt + 1);
      }

      if (!response.ok) {
        console.error('Backend returned error:', {
          status: response.status,
          statusText: response.statusText,
          body: responseBody || responseText,
        });
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
        console.error('Invalid response format:', {
          hasSuccess: !!data?.success,
          successValue: data?.success,
          hasData: !!data?.data,
          dataValue: data?.data,
          fullResponse: data,
        });
        throw new Error('Invalid response format from backend');
      }

      

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
      

      try {
        const backendUser = await fetchUserFromBackend(clerkUserId);
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

        console.error('Failed to sync user with backend', error);
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
  }, [clerkIsLoaded, clerkUserId, isSignedIn, fetchUserFromBackend, determineAuthErrorKey]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    // Clerk handles authentication, this is just for compatibility
    setAuthError(null);
    return { success: true };
  };

  const logout = useCallback(async () => {
    try {
      setIsSigningOut(true);
      // Clear local user state first
      setCurrentUser(null);
      setAuthError(null);
      syncAttemptRef.current = INITIAL_SYNC_STATE;

      // Properly sign out from Clerk
      await clerkSignOut();
      
      // Note: We do NOT reset isSigningOut here.
      // The isSignedIn state from Clerk may not have updated yet,
      // causing a brief flash of the "select role" screen on the login page.
      // Instead, we let the useEffect below reset isSigningOut when
      // Clerk's isSignedIn becomes false.
    } catch (error) {
      console.error('Logout error', error);
      // Still clear local state even if Clerk signOut fails
      setCurrentUser(null);
      // Only reset isSigningOut on error - the user needs to try again
      setIsSigningOut(false);
    }
  }, [clerkSignOut]);

  // Reset isSigningOut flag when Clerk confirms sign-out is complete
  // This prevents a flash of the "select role" screen during sign-out
  useEffect(() => {
    if (isSigningOut && clerkIsLoaded && !isSignedIn) {
      setIsSigningOut(false);
    }
  }, [isSigningOut, clerkIsLoaded, isSignedIn]);

  const signup = async (formData: any, role: any): Promise<{ success: boolean; message?: string; redirectTo?: string }> => {
    // Clerk handles signup, this is just for compatibility
    return { success: true };
  };

  const updateCurrentUserInfo = useCallback(
    async (updatedInfo: Partial<User>) => {

      if (!currentUser) {
        console.error('Cannot update user: current user is not loaded');
        return;
      }

      try {
        const token = await getToken();

        if (!token) {
          console.error('Authentication token not available');
          throw new ApiError('Authentication token not available', 401, 'auth_token_missing');
        }

        // Prepare data for backend (remove frontend-only fields)
        const backendData: any = { ...updatedInfo };
        
        // Map orgName to organizationName for the profiles endpoint
        if (backendData.orgName !== undefined) {
          backendData.organizationName = backendData.orgName;
          delete backendData.orgName;
        }
        
        // Remove frontend-only fields that backend doesn't accept
        delete backendData.name; // We use firstName/lastName separately
        delete backendData.status; // Transformed field, not raw backend field
        delete backendData.lastLogin; // Transformed field
        delete backendData.memberSince; // Transformed field
        delete backendData.organizations; // Many-to-many relation, not direct field
        
        // Determine which endpoint to use based on what's being updated
        // Use profiles endpoint if updating organization-related fields
        const hasOrgFields = backendData.organizationName !== undefined || 
                           backendData.description !== undefined ||
                           backendData.contactPerson !== undefined ||
                           backendData.canton !== undefined ||
                           backendData.languages !== undefined;
        
        const apiBaseUrl = apiService.apiBaseUrl;
        const url = hasOrgFields 
          ? `${apiBaseUrl}${API_ENDPOINTS.profiles.update}`
          : `${apiBaseUrl}${API_ENDPOINTS.users.update}`;
        const method = hasOrgFields ? 'PUT' : 'PATCH';


        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(backendData),
        });


        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Update request failed:', {
            status: response.status,
            body: errorBody,
          });
          throw new ApiError('Failed to update user', response.status);
        }

        const data = await response.json();
        
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
        } else {
          console.error('Invalid response format received from update request:', data);
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Failed to update user', error);
        throw error;
      }
    },
    [currentUser, getToken, transformBackendUser, clerkUserId]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!clerkUser) {
        throw new Error('Authenticated user is not available');
      }

      try {
        // Update password directly via Clerk
        // Clerk's updatePassword handles verification automatically when currentPassword is provided
        await clerkUser.updatePassword({ 
          currentPassword, 
          newPassword,
          signOutOfOtherSessions: false,
        });
      } catch (error: any) {
        console.error('Failed to change password via Clerk', error);

        // Handle the specific "additional verification" error
        const errorMessage = error?.message || '';
        const errorCode = error?.code || error?.status || '';
        
        // If Clerk requires additional verification
        if (
          errorMessage.includes('additional verification') || 
          errorMessage.includes('verification') ||
          errorCode === 403 ||
          error?.status === 403
        ) {
          throw new Error(
            'Additional verification is required to change your password. ' +
            'Please ensure you entered your current password correctly, or sign out and sign back in, then try again.'
          );
        }

        // Handle incorrect current password
        if (errorMessage.includes('current password') || errorMessage.includes('incorrect')) {
          throw new Error('The current password you entered is incorrect. Please try again.');
        }

        // Handle Clerk-specific errors
        const clerkErrors = error?.errors;
        if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
          const message = clerkErrors
            .map((e: any) => e?.message)
            .filter(Boolean)
            .join(' ');
          throw new Error(message || 'Password update failed');
        }

        if (error instanceof Error && error.message) {
          throw new Error(error.message);
        }

        throw new Error('Unable to update password. Please try again.');
      }

      try {
        const token = await getToken();

        if (!token) {
          console.warn('Password change succeeded but audit token was unavailable');
          return;
        }

        const url = `${apiService.apiBaseUrl}${API_ENDPOINTS.security.passwordChange}`;

        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            occurredAt: new Date().toISOString(),
            method: 'clerk',
          }),
        });
      } catch (auditError) {
        console.error('Password change audit logging failed', auditError);
      }
    },
    [clerkUser, getToken]
  );

  const changeEmail = useCallback(
    async (newEmail: string) => {
      if (!clerkUser) {
        throw new Error('Authenticated user is not available');
      }

      const previousEmail = clerkUser.primaryEmailAddress?.emailAddress || currentUser?.email;

      try {
        // Create a new email address in Clerk
        // This will trigger a verification email to the new address
        const emailAddress = await clerkUser.createEmailAddress({ email: newEmail });
        
        // Prepare for verification - Clerk will send a verification email
        await emailAddress.prepareVerification({ strategy: 'email_code' });
        
        // Note: The actual email change will be completed after verification
        // We store the pending email change info for the UI to handle verification
        return;
      } catch (error: any) {
        console.error('Failed to initiate email change via Clerk', error);

        // Handle Clerk-specific errors
        const clerkErrors = error?.errors;
        if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
          const firstError = clerkErrors[0];
          const errorCode = firstError?.code || '';
          const message = clerkErrors
            .map((e: any) => e?.longMessage || e?.message)
            .filter(Boolean)
            .join(' ');
          
          // Handle verification_strategy_requires_reverification error
          if (errorCode === 'verification_strategy_requires_reverification' ||
              message.includes('additional verification')) {
            throw new Error(
              'For security reasons, you need to sign out and sign back in before changing your email address. ' +
              'This helps us verify your identity for sensitive account changes.'
            );
          }
          
          throw new Error(message || 'Email change failed');
        }

        const errorMessage = error?.message || '';
        const errorStatus = error?.status || error?.code;
        
        // Handle 403 additional verification requirement
        if (errorStatus === 403 || 
            errorMessage.includes('additional verification') ||
            errorMessage.includes('verification')) {
          throw new Error(
            'For security reasons, you need to sign out and sign back in before changing your email address. ' +
            'This helps us verify your identity for sensitive account changes.'
          );
        }
        
        // Handle duplicate email
        if (errorMessage.includes('already exists') || errorMessage.includes('taken')) {
          throw new Error('This email address is already in use by another account.');
        }

        // Handle invalid email
        if (errorMessage.includes('invalid') || errorMessage.includes('Invalid')) {
          throw new Error('Please enter a valid email address.');
        }

        if (error instanceof Error && error.message) {
          throw new Error(error.message);
        }

        throw new Error('Unable to change email. Please try again.');
      }
    },
    [clerkUser, currentUser?.email]
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

  const verifyEmailChange = useCallback(
    async (code: string, emailAddressId: string) => {
      if (!clerkUser) {
        throw new Error('Authenticated user is not available');
      }

      const previousEmail = clerkUser.primaryEmailAddress?.emailAddress || currentUser?.email;

      try {
        // Find the email address to verify
        const emailAddress = clerkUser.emailAddresses.find(e => e.id === emailAddressId);
        
        if (!emailAddress) {
          throw new Error('Email address not found');
        }

        // Verify the email with the code
        await emailAddress.attemptVerification({ code });

        // Set it as primary
        await clerkUser.update({ primaryEmailAddressId: emailAddress.id });

        // Get the new email
        const newEmail = emailAddress.emailAddress;

        // Record the change on our backend
        try {
          const token = await getToken();

          if (token) {
            const url = `${apiService.apiBaseUrl}${API_ENDPOINTS.security.emailChange}`;

            await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                occurredAt: new Date().toISOString(),
                method: 'clerk',
                previousEmail: previousEmail,
                newEmail: newEmail,
              }),
            });
          }
        } catch (auditError) {
          console.error('Email change audit logging failed', auditError);
        }

        // Refresh user to get updated email
        await refreshCurrentUser();
      } catch (error: any) {
        console.error('Failed to verify email change', error);

        const clerkErrors = error?.errors;
        if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
          const message = clerkErrors
            .map((e: any) => e?.longMessage || e?.message)
            .filter(Boolean)
            .join(' ');
          throw new Error(message || 'Email verification failed');
        }

        if (error?.message?.includes('incorrect') || error?.message?.includes('invalid')) {
          throw new Error('The verification code is incorrect. Please try again.');
        }

        if (error instanceof Error && error.message) {
          throw new Error(error.message);
        }

        throw new Error('Unable to verify email. Please try again.');
      }
    },
    [clerkUser, currentUser?.email, getToken, refreshCurrentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoading,
        isAuthenticated,
        authError,
        isSigningOut,
        clearAuthError: () => setAuthError(null),
        login,
        logout,
        signup,
        updateCurrentUserInfo,
        refreshCurrentUser,
        changePassword,
        changeEmail,
        verifyEmailChange,
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
