import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { FrontendSettings } from '../types';
import { API_ENDPOINTS } from '../services/api-endpoints';

export const useFrontendSettings = () => {
  const [settings, setSettings] = useState<FrontendSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      // Use the public endpoint for settings
      const response = await apiService.get<FrontendSettings>(`${API_ENDPOINTS.settings.frontend}/public`, { signal });
      if (response.success && response.data) {
        setSettings(response.data);
      } else {
        setError(response.message || 'Failed to load settings');
      }
    } catch (err: any) {
      // Silently ignore abort errors - they're expected when component unmounts
      if (err.name === 'AbortError' || (err instanceof Error && err.name === 'AbortError')) {
        return;
      }
      console.error('Error fetching frontend settings:', err);
      setError(err.message || 'An error occurred');
    } finally {
      // Only set loading to false if request wasn't aborted
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    fetchSettings(abortController.signal);
    
    return () => abortController.abort();
  }, []);

  return { settings, loading, error, refetch: () => fetchSettings() };
};
