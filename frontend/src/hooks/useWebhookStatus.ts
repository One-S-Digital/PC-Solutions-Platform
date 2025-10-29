import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface WebhookStatus {
  exists: boolean;
  isPending: boolean;
  clerkId: string;
  timestamp: string;
}

export const useWebhookStatus = (clerkId: string) => {
  const [status, setStatus] = useState<'pending' | 'processing' | 'ready' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const { getToken } = useAuth();

  const checkWebhookStatus = useCallback(async () => {
    if (!clerkId) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/users/webhook-status/${clerkId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const webhookStatus: WebhookStatus = data.data;

      if (webhookStatus.exists) {
        setStatus('ready');
        setIsPolling(false);
      } else {
        setStatus('processing');
        setError(null);
      }
    } catch (err) {
      console.error('Error checking webhook status:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to check account status');
    }
  }, [clerkId, getToken]);

  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    setStatus('processing');
    
    // Initial check
    checkWebhookStatus();
    
    // Poll every 1 second
    const interval = setInterval(checkWebhookStatus, 1000);
    
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