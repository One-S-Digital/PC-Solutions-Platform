import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncOptions {
  waitForWebhook?: boolean;
  webhookTimeout?: number;
  forceSync?: boolean;
}

export interface SyncResult {
  user: any | null;
  method?: 'database' | 'webhook' | 'clerk-api';
  synced?: boolean;
  duration?: number;
}

/**
 * Unified Auth Sync Hook
 * 
 * Single hook for all authentication synchronization needs.
 * Replaces scattered sync logic across components.
 * 
 * Usage:
 * ```typescript
 * const { ensureUserSynced, syncState, error } = useAuthSync();
 * 
 * // In signup/login flows
 * const user = await ensureUserSynced({
 *   waitForWebhook: true,
 *   webhookTimeout: 5000
 * });
 * ```
 */
export function useAuthSync() {
  const { getToken } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncDuration, setLastSyncDuration] = useState<number | null>(null);

  /**
   * Ensures user exists in backend
   * Handles all sync scenarios automatically via UserSyncService
   */
  const ensureUserSynced = useCallback(async (options: SyncOptions = {}): Promise<SyncResult> => {
    console.log('🔄 [useAuthSync] Starting user sync', options);
    setSyncState('syncing');
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/api/auth/ensure-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'User sync failed');
      }
      
      console.log('✅ [useAuthSync] User synced successfully', {
        method: data.meta?.method,
        duration: data.meta?.duration,
        synced: data.meta?.synced,
      });
      
      setSyncState('synced');
      setLastSyncDuration(data.meta?.duration || null);
      
      return {
        user: data.data,
        method: data.meta?.method,
        synced: data.meta?.synced,
        duration: data.meta?.duration,
      };
      
    } catch (err) {
      console.error('❌ [useAuthSync] Sync failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
      setSyncState('error');
      setError(errorMessage);
      
      return {
        user: null,
      };
    }
  }, [getToken]);

  /**
   * Quick sync without waiting for webhook (for manual operations)
   */
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    return ensureUserSynced({
      waitForWebhook: false,
      forceSync: false,
    });
  }, [ensureUserSynced]);

  /**
   * Force re-sync even if user exists (for refresh operations)
   */
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    return ensureUserSynced({
      waitForWebhook: false,
      forceSync: true,
    });
  }, [ensureUserSynced]);

  /**
   * Reset sync state (for retries)
   */
  const reset = useCallback(() => {
    setSyncState('idle');
    setError(null);
    setLastSyncDuration(null);
  }, []);

  return {
    // Main sync function
    ensureUserSynced,
    
    // Convenience methods
    syncNow,
    forceSync,
    reset,
    
    // State
    syncState,
    error,
    lastSyncDuration,
    
    // Computed states
    isSync ing: syncState === 'syncing',
    isSynced: syncState === 'synced',
    hasError: syncState === 'error',
  };
}

export default useAuthSync;
