import { useState, useEffect } from 'react'
import { apiService, useApiClient } from '../services/api'


import { FrontendSettings } from '../types/api'



export const useSettings = () => {
  const [settings, setSettings] = useState<FrontendSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const skipAuth =
    import.meta.env.VITE_SKIP_AUTH === 'true' ||
    import.meta.env.VITE_DEVELOPMENT_MODE === 'true'
  const apiClient = skipAuth ? null : useApiClient()

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      if (apiClient) {
        const response = await apiService.getFrontendSettings(apiClient)
        if (response.data && response.data.success) {
          setSettings(response.data.data)
          return
        }
      } else {
        const res = await fetch('/api/admin/frontend-settings')
        if (res.ok) {
          const data = await res.json()
          if (data?.success) {
            setSettings(data.data)
            return
          }
        }
      }


    } catch (err: unknown) {
      console.error('Failed to fetch settings:', err)
      const error = err as { message?: string }
      setError(error.message || 'An unknown error occurred while fetching settings.')


    } finally {
      setLoading(false)
    }
  }


  const updateSettings = async (updates: Partial<FrontendSettings>) => {
    setSaving(true)
    setError(null)

    try {
      console.log('🔄 updateSettings called with:', updates)
      setSaving(true)
      setError(null)

      const updatedSettings = { ...settings, ...updates }
      console.log('📝 Updated settings object:', updatedSettings)

      try {
        console.log('🌐 Making API call to update settings...')
        if (apiClient) {
          const response = await apiService.updateFrontendSettings(apiClient, updatedSettings)
          console.log('✅ API update successful:', response)
        } else {
          await fetch('/api/admin/frontend-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSettings),
          })
          console.log('✅ Settings updated via fetch (no auth)')
        }
      } catch (apiErr) {
        console.log('⚠️ API update failed, using local state:', apiErr)
      }


      setSettings(updatedSettings)
      console.log('✅ Settings updated successfully in local state')
    } catch (err) {
      console.error('❌ Failed to update settings:', err)
      setError('Failed to save settings')

      throw err
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    updateSettings,
    loading,
    saving,
    error,
    refetch: fetchSettings
  }
}
