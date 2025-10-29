import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { debugLogger } from '../utils/debugLogger';

/**
 * Hook to automatically log navigation and authentication changes
 */
export const useDebugLogger = () => {
  const location = useLocation();
  const { isSignedIn, isLoaded, userId } = useAuth();

  // Log page navigation
  useEffect(() => {
    debugLogger.info('NAVIGATION', 'Page changed', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state
    });
  }, [location]);

  // Log authentication state changes
  useEffect(() => {
    debugLogger.info('AUTH', 'Authentication state changed', {
      isSignedIn,
      isLoaded,
      userId,
      timestamp: new Date().toISOString()
    });
  }, [isSignedIn, isLoaded, userId]);

  // Log when component mounts/unmounts
  useEffect(() => {
    debugLogger.info('LIFECYCLE', 'Component mounted', {
      pathname: location.pathname,
      timestamp: new Date().toISOString()
    });

    return () => {
      debugLogger.info('LIFECYCLE', 'Component unmounting', {
        pathname: location.pathname,
        timestamp: new Date().toISOString()
      });
    };
  }, [location.pathname]);
};

export default useDebugLogger;