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
      if (err.name === 'AbortError') return; // Ignore abort errors
      console.error('Error fetching frontend settings:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    fetchSettings(abortController.signal);
    
    return () => abortController.abort();
  }, []);

  return { settings, loading, error, refetch: () => fetchSettings() };
};
