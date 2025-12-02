import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiService } from '@/services/api';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);

  const checkWebhookStatus = useCallback(async (): Promise<'pending' | 'processing' | 'ready' | 'error'> => {
    try {
        const token = await getToken();

        if (!token) {
          console.warn('[Signup Debug] webhook-status: missing auth token, session not yet active');
          setStatus('processing');
          return 'processing';
        }

        // Note: No clerkId in URL - backend reads it from authenticated session
        const response = await fetch(`${apiService.apiBaseUrl}/users/webhook-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Signup Debug] webhook-status: non-OK response', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const webhookStatus: WebhookStatus = data.data;

      if (webhookStatus.exists) {
        setStatus('ready');
        setIsPolling(false);
        isPollingRef.current = false;
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
      setIsPolling(false);
      isPollingRef.current = false;
      return 'error';
    }
  }, [getToken]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearTimers();
    isPollingRef.current = false;
    setIsPolling(false);
  }, [clearTimers]);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) {
      return stopPolling;
    }

    isPollingRef.current = true;
    setIsPolling(true);
    setStatus('processing');
    setError(null);

    checkWebhookStatus();

    intervalRef.current = setInterval(() => {
      checkWebhookStatus();
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      if (isPollingRef.current) {
        isPollingRef.current = false;
        setIsPolling(false);
        setStatus(prev => (prev === 'ready' ? 'ready' : 'error'));
        setError(prev => prev ?? 'Account setup timeout - please contact support');
        console.warn('[Signup Debug] webhook-status polling timed out');
      }
    }, 30000);

    return stopPolling;
  }, [checkWebhookStatus, clearTimers, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

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
