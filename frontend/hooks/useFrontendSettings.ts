import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { FrontendSettings } from '../types';
import { API_ENDPOINTS } from '../services/api-endpoints';

export const useFrontendSettings = () => {
  const [settings, setSettings] = useState<FrontendSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // Use the public endpoint for settings
        const response = await apiService.get<FrontendSettings>(`${API_ENDPOINTS.settings.frontend}/public`);
        if (response.success && response.data) {
          setSettings(response.data);
        } else {
          setError(response.message || 'Failed to load settings');
        }
      } catch (err: any) {
        console.error('Error fetching frontend settings:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
};
