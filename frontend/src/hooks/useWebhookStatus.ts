import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Use ref to track current status for timeout callback (avoids stale closure)
  const statusRef = useRef(status);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
    
    // Clear any existing intervals/timeouts
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Initial check
    checkWebhookStatus();
    
    // Poll every 1 second
    intervalRef.current = setInterval(() => {
      console.log('🔄 [WEBHOOK] Polling attempt...');
      // Stop polling if we've reached a terminal state
      if (statusRef.current === 'ready' || statusRef.current === 'error') {
        console.log('🛑 [WEBHOOK] Terminal state reached, stopping polling:', statusRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsPolling(false);
        return;
      }
      checkWebhookStatus();
    }, 1000);
    
    // Stop polling after 30 seconds - use statusRef to check current status
    timeoutRef.current = setTimeout(() => {
      console.log('⏱️ [WEBHOOK] 30-second timeout reached');
      console.log('⏱️ [WEBHOOK] Current status (from ref):', statusRef.current);
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPolling(false);
      
      // Check the CURRENT status via ref, not the captured value
      if (statusRef.current === 'processing' || statusRef.current === 'pending') {
        console.log('❌ [WEBHOOK] Timeout - user was never created. Webhook may not be configured or failed.');
        setStatus('error');
        setError('Account creation is taking longer than expected. Your account may still be processing. Please try logging in, or contact support if the issue persists.');
      } else {
        console.log('✅ [WEBHOOK] Timeout reached but status is already:', statusRef.current);
      }
    }, 30000);

    return () => {
      console.log('🛑 [WEBHOOK] Cleanup - stopping polling');
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsPolling(false);
    };
  }, [checkWebhookStatus, isPolling]);

  const stopPolling = useCallback(() => {
    console.log('🛑 [WEBHOOK] stopPolling called');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [WEBHOOK] Hook unmounting, cleaning up...');
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
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