import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface WebhookStatus {
  exists: boolean;
  isPending: boolean;
  clerkId: string;
  timestamp: string;
}

/**
 * Hook to check webhook processing status during signup.
 * 
 * Security: Uses authenticated user session to check status, preventing user enumeration.
 * The backend endpoint reads clerkId from the JWT token, not from URL parameters.
 */
export const useWebhookStatus = () => {
  const [status, setStatus] = useState<'pending' | 'processing' | 'ready' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const { getToken } = useAuth();

  const checkWebhookStatus = useCallback(async (): Promise<'pending' | 'processing' | 'ready' | 'error'> => {
    try {
      const token = await getToken();
      
      if (!token) {
        setStatus('processing');
        return 'processing';
      }
      
      // Note: No clerkId in URL - backend reads it from authenticated session
      const response = await fetch('/api/users/webhook-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const webhookStatus: WebhookStatus = data.data;

      if (webhookStatus.exists) {
        setStatus('ready');
        setIsPolling(false);
        return 'ready';
      } else {
        setStatus('processing');
        setError(null);
        return 'processing';
      }
    } catch (err) {
      console.error('Error checking webhook status:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to check account status');
      return 'error';
    }
  }, [getToken]);

  const startPolling = useCallback(() => {
    if (isPolling) {
      return;
    }
    
    setIsPolling(true);
    setStatus('processing');
    
    // Initial check
    checkWebhookStatus();
    
    // Poll every 1 second
    const interval = setInterval(() => {
      checkWebhookStatus();
    }, 1000);
    
    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
      if (status === 'processing') {
        setStatus('error');
        setError('Account setup timeout - please contact support');
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setIsPolling(false);
    };
  }, [checkWebhookStatus, isPolling, status]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    status,
    error,
    isPolling,
    checkWebhookStatus,
    startPolling,
    stopPolling,
  };
};

export default useWebhookStatus;
