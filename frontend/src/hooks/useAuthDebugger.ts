import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { authDebugger } from '../utils/authDebugger';

/**
 * Hook to automatically log auth-related events
 * Use this in components that are part of the auth flow
 */
export const useAuthDebugger = () => {
  const location = useLocation();
  const { user, isLoaded: userIsLoaded } = useUser();
  const { isSignedIn, isLoaded: authIsLoaded } = useAuth();

  // Log route changes
  useEffect(() => {
    if (authDebugger.isEnabled()) {
      authDebugger.logRouteEnter(location.pathname);
    }
  }, [location.pathname]);

  // Log Clerk state changes
  useEffect(() => {
    if (authDebugger.isEnabled() && authIsLoaded) {
      authDebugger.logClerkState(userIsLoaded, isSignedIn || false);
    }
  }, [userIsLoaded, isSignedIn, authIsLoaded]);

  return {
    logGuardCheck: authDebugger.logGuardCheck.bind(authDebugger),
    logRedirect: authDebugger.logRouterRedirect.bind(authDebugger),
    log: authDebugger.log.bind(authDebugger),
  };
};

/**
 * Hook for signup page
 */
export const useSignupDebugger = () => {
  useAuthDebugger();

  return {
    logOpened: authDebugger.logSignupOpened.bind(authDebugger),
    logSubmit: authDebugger.logSignupSubmit.bind(authDebugger),
    logSignupCreate: authDebugger.logClerkSignupCreate.bind(authDebugger),
    logVerifyStart: authDebugger.logClerkVerifyStart.bind(authDebugger),
    logVerifyDone: authDebugger.logClerkVerifyDone.bind(authDebugger),
    logSetActive: authDebugger.logClerkSetActive.bind(authDebugger),
    logRedirect: authDebugger.logSignupRedirect.bind(authDebugger),
  };
};

/**
 * Hook for login page
 */
export const useLoginDebugger = () => {
  useAuthDebugger();

  return {
    logOpened: authDebugger.logLoginOpened.bind(authDebugger),
    logSigninCreate: authDebugger.logClerkSigninCreate.bind(authDebugger),
    logSetActive: authDebugger.logClerkSetActive.bind(authDebugger),
    logRedirect: authDebugger.logLoginRedirect.bind(authDebugger),
  };
};

/**
 * Hook for HTTP requests (for API calls)
 */
export const useHttpDebugger = () => {
  return {
    logRequest: authDebugger.logHttpRequest.bind(authDebugger),
    logResponse: authDebugger.logHttpResponse.bind(authDebugger),
  };
};
