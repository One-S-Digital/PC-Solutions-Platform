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
      console.log('🔍 [WEBHOOK] Checking webhook status (using authenticated session)');
      const token = await getToken();
      
      if (!token) {
        console.log('⚠️ [WEBHOOK] No auth token available, user may not be authenticated yet');
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

      console.log('📡 [WEBHOOK] API response:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ [WEBHOOK] API error:', { status: response.status, body: errorText });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 [WEBHOOK] API data:', data);
      const webhookStatus: WebhookStatus = data.data;

      if (webhookStatus.exists) {
        console.log('✅ [WEBHOOK] User exists! Signup complete.');
        setStatus('ready');
        setIsPolling(false);
        return 'ready';
      } else {
        console.log('⏳ [WEBHOOK] User not yet created, continuing to poll...');
        setStatus('processing');
        setError(null);
        return 'processing';
      }
    } catch (err) {
      console.error('🔴 [WEBHOOK] Error checking webhook status:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to check account status');
      return 'error';
    }
  }, [getToken]);

  const startPolling = useCallback(() => {
    if (isPolling) {
      console.log('⏸️ [WEBHOOK] Already polling, skipping');
      return;
    }
    
    console.log('🚀 [WEBHOOK] Starting polling for user creation...');
    setIsPolling(true);
    setStatus('processing');
    
    // Initial check
    checkWebhookStatus();
    
    // Poll every 1 second
    const interval = setInterval(() => {
      console.log('🔄 [WEBHOOK] Polling attempt...');
      checkWebhookStatus();
    }, 1000);
    
    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      console.log('⏱️ [WEBHOOK] 30-second timeout reached');
      clearInterval(interval);
      setIsPolling(false);
      if (status === 'processing') {
        console.log('❌ [WEBHOOK] Timeout - user was never created');
        setStatus('error');
        setError('Account setup timeout - please contact support');
      }
    }, 30000);

    return () => {
      console.log('🛑 [WEBHOOK] Cleanup - stopping polling');
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