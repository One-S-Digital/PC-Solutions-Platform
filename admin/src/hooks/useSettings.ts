import { useState, useEffect, useRef } from 'react'
import { apiService, useApiClient } from '../services/api'
import { FrontendSettings } from '../types/api'
import settingsDebugger, { serializeError } from '../debug/settingsDebugger'

const getSettingsKeys = (value: FrontendSettings | null) => (value ? Object.keys(value) : [])

const getElapsedMs = (start: number | null) => {
  if (start === null || typeof performance === 'undefined') {
    return null
  }

  return Math.round(performance.now() - start)
}

type FetchMetrics = {
  attempts: number
  successes: number
  failures: number
}

export const useSettings = () => {
  const [settings, setSettings] = useState<FrontendSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const skipAuth =
    import.meta.env.VITE_SKIP_AUTH === 'true' ||
    import.meta.env.VITE_DEVELOPMENT_MODE === 'true'
  const apiClient = skipAuth ? null : useApiClient()

  const fetchMetricsRef = useRef<FetchMetrics>({ attempts: 0, successes: 0, failures: 0 })
  const lastErrorRef = useRef<string | null>(null)
  const lastApiClientStateRef = useRef<boolean | null>(null)

  const syncMetricsToDebugger = () => {
    settingsDebugger.updateSnapshot({
      fetchAttempts: fetchMetricsRef.current.attempts,
      fetchSuccesses: fetchMetricsRef.current.successes,
      fetchFailures: fetchMetricsRef.current.failures,
    })
  }

  useEffect(() => {
    settingsDebugger.recordEvent({
      severity: 'info',
      scope: 'hook',
      message: 'useSettings hook mounted',
      details: {
        skipAuth,
        mode: import.meta.env.MODE,
        apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
      },
    })

    settingsDebugger.updateSnapshot({
      skipAuth,
      env: {
        mode: import.meta.env.MODE,
        apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
      },
    })

    return () => {
      settingsDebugger.recordEvent({
        severity: 'info',
        scope: 'hook',
        message: 'useSettings hook unmounted',
      })
    }
  }, [skipAuth])

  useEffect(() => {
    const hasClient = !!apiClient

    if (skipAuth) {
      if (lastApiClientStateRef.current !== null) {
        lastApiClientStateRef.current = null
      }

      settingsDebugger.updateSnapshot({
        hasApiClient: null,
      })

      settingsDebugger.recordEvent({
        severity: 'info',
        scope: 'auth',
        message: 'Settings hook operating with skipAuth enabled; using fetch fallback.',
      })

      return
    }

    if (lastApiClientStateRef.current === hasClient) {
      settingsDebugger.updateSnapshot({
        hasApiClient: hasClient,
      })
      return
    }

    lastApiClientStateRef.current = hasClient

    settingsDebugger.updateSnapshot({
      hasApiClient: hasClient,
    })

    settingsDebugger.recordEvent({
      severity: hasClient ? 'info' : 'warn',
      scope: 'auth',
      message: hasClient
        ? 'Authenticated API client ready for settings requests.'
        : 'Failed to initialise authenticated API client for settings requests.',
      details: {
        skipAuth,
      },
    })
  }, [apiClient, skipAuth])

  useEffect(() => {
    settingsDebugger.updateSnapshot({ loading })
  }, [loading])

  useEffect(() => {
    settingsDebugger.updateSnapshot({ saving })
  }, [saving])

  useEffect(() => {
    settingsDebugger.updateSnapshot({ error })

    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error

      settingsDebugger.recordEvent({
        severity: 'error',
        scope: 'hook',
        message: 'Settings hook entered error state',
        details: { error },
      })
    } else if (!error) {
      lastErrorRef.current = null
    }
  }, [error])

  useEffect(() => {
    settingsDebugger.updateSnapshot({
      settingsPresent: !!settings,
      settingsKeys: getSettingsKeys(settings),
    })
  }, [settings])

  const fetchSettings = async () => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : null
    const transport: 'axios' | 'fetch' = apiClient ? 'axios' : 'fetch'

    fetchMetricsRef.current.attempts += 1

    settingsDebugger.updateSnapshot({
      loading: true,
      error: null,
      lastIssue: null,
      lastFetchTransport: transport,
    })

    syncMetricsToDebugger()

    settingsDebugger.recordEvent({
      severity: 'info',
      scope: 'fetch',
      message: 'Starting frontend settings request',
      details: {
        transport,
        attempt: fetchMetricsRef.current.attempts,
        skipAuth,
        hasApiClient: !!apiClient,
      },
    })

    try {
      setLoading(true)
      setError(null)

      if (apiClient) {
        const response = await apiService.getFrontendSettings(apiClient)

        settingsDebugger.recordEvent({
          severity: response.data?.success ? 'info' : 'warn',
          scope: 'network',
          message: 'Received response from /admin/frontend-settings (axios client)',
          details: {
            status: response.status,
            successFlag: response.data?.success,
            dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
          },
        })

        if (response.data && response.data.success) {
          setSettings(response.data.data)
          fetchMetricsRef.current.successes += 1

          settingsDebugger.updateSnapshot({
            fetchSuccesses: fetchMetricsRef.current.successes,
            lastFetchStatus: response.status,
            lastFetchDurationMs: getElapsedMs(startedAt),
            lastSuccessTimestamp: Date.now(),
            settingsPresent: true,
            settingsKeys: response.data.data ? Object.keys(response.data.data) : [],
            lastIssue: null,
          })

          settingsDebugger.recordEvent({
            severity: 'info',
            scope: 'fetch',
            message: 'Frontend settings loaded successfully via axios client',
            details: {
              attempt: fetchMetricsRef.current.attempts,
              keyCount: response.data.data ? Object.keys(response.data.data).length : 0,
            },
          })
          return
        }

        fetchMetricsRef.current.failures += 1

        const issueMessage =
          response.data?.message || 'API returned success=false for frontend settings request.'

        settingsDebugger.updateSnapshot({
          fetchFailures: fetchMetricsRef.current.failures,
          lastFetchStatus: response.status,
          lastErrorTimestamp: Date.now(),
          lastIssue: issueMessage,
        })

        settingsDebugger.recordEvent({
          severity: 'error',
          scope: 'fetch',
          message: 'Frontend settings API returned unsuccessful payload',
          details: {
            status: response.status,
            payload: response.data,
          },
        })
        return
      }

      const res = await fetch('/api/admin/frontend-settings')

      settingsDebugger.recordEvent({
        severity: res.ok ? 'info' : 'warn',
        scope: 'network',
        message: `Fetch request to /api/admin/frontend-settings completed with status ${res.status}`,
        details: {
          statusText: res.statusText,
          ok: res.ok,
        },
      })

      if (res.ok) {
        const data = await res.json()

        if (data?.success) {
          setSettings(data.data)
          fetchMetricsRef.current.successes += 1

          settingsDebugger.updateSnapshot({
            fetchSuccesses: fetchMetricsRef.current.successes,
            lastFetchStatus: res.status,
            lastFetchDurationMs: getElapsedMs(startedAt),
            lastSuccessTimestamp: Date.now(),
            settingsPresent: true,
            settingsKeys: data.data ? Object.keys(data.data) : [],
            lastIssue: null,
          })

          settingsDebugger.recordEvent({
            severity: 'info',
            scope: 'fetch',
            message: 'Frontend settings loaded successfully via fetch fallback',
            details: {
              attempt: fetchMetricsRef.current.attempts,
              keyCount: data.data ? Object.keys(data.data).length : 0,
            },
          })
          return
        }

        const issueMessage =
          data?.message || 'Fetch fallback returned success=false for frontend settings request.'

        fetchMetricsRef.current.failures += 1

        settingsDebugger.updateSnapshot({
          fetchFailures: fetchMetricsRef.current.failures,
          lastFetchStatus: res.status,
          lastErrorTimestamp: Date.now(),
          lastIssue: issueMessage,
        })

        settingsDebugger.recordEvent({
          severity: 'error',
          scope: 'fetch',
          message: 'Frontend settings fetch fallback returned invalid payload',
          details: {
            payload: data,
          },
        })
        return
      }

      fetchMetricsRef.current.failures += 1

      settingsDebugger.updateSnapshot({
        fetchFailures: fetchMetricsRef.current.failures,
        lastFetchStatus: res.status,
        lastErrorTimestamp: Date.now(),
        lastIssue: `Fetch returned HTTP ${res.status}`,
      })

      settingsDebugger.recordEvent({
        severity: 'error',
        scope: 'fetch',
        message: 'Frontend settings fetch fallback failed with HTTP error',
        details: {
          status: res.status,
          statusText: res.statusText,
        },
      })
    } catch (err: unknown) {
      const errorPayload = serializeError(err)

      fetchMetricsRef.current.failures += 1

      settingsDebugger.updateSnapshot({
        fetchFailures: fetchMetricsRef.current.failures,
        lastFetchStatus: errorPayload.status ?? null,
        lastErrorTimestamp: Date.now(),
        lastIssue: errorPayload.message ?? 'Unknown error while fetching settings.',
      })

      settingsDebugger.recordEvent({
        severity: 'error',
        scope: 'fetch',
        message: 'Failed to fetch frontend settings',
        details: errorPayload,
      })

      console.error('Failed to fetch settings:', err)
      const error = err as { message?: string }
      setError(error.message || 'An unknown error occurred while fetching settings.')
    } finally {
      const duration = getElapsedMs(startedAt)
      if (duration !== null) {
        settingsDebugger.updateSnapshot({
          lastFetchDurationMs: duration,
        })
      }

      syncMetricsToDebugger()
      setLoading(false)
      settingsDebugger.updateSnapshot({ loading: false })
    }
  }

  const updateSettings = async (updates: Partial<FrontendSettings>) => {
    setSaving(true)
    setError(null)
    settingsDebugger.updateSnapshot({ saving: true })

    settingsDebugger.recordEvent({
      severity: 'info',
      scope: 'update',
      message: 'Attempting to update frontend settings',
      details: {
        keys: Object.keys(updates || {}),
        skipAuth,
        hasApiClient: !!apiClient,
      },
    })

    try {
      console.log('🔄 updateSettings called with:', updates)
      setSaving(true)
      setError(null)

      const updatedSettings = { ...(settings || {}), ...updates }
      console.log('📝 Updated settings object:', updatedSettings)

      // Filter out non-updatable fields to prevent validation errors
      const { 
        id, 
        createdAt, 
        updatedAt, 
        logoAsset, 
        faviconAsset, 
        ogImageAsset, 
        adminLogoAsset, 
        adminFaviconAsset,
        ...allowedUpdates 
      } = updatedSettings

      console.log('🔧 Filtered updates for API:', allowedUpdates)

      try {
        console.log('🌐 Making API call to update settings...')
        if (apiClient) {
          const response = await apiService.updateFrontendSettings(apiClient, allowedUpdates)
          console.log('✅ API update successful:', response)
          settingsDebugger.recordEvent({
            severity: 'info',
            scope: 'update',
            message: 'Settings update persisted through API client',
            details: {
              responseStatus: response.status,
            },
          })
        } else {
          await fetch('/api/admin/frontend-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allowedUpdates),
          })
          console.log('✅ Settings updated via fetch (no auth)')
          settingsDebugger.recordEvent({
            severity: 'info',
            scope: 'update',
            message: 'Settings update sent via fetch fallback',
          })
        }
      } catch (apiErr) {
        console.log('⚠️ API update failed, using local state:', apiErr)
        settingsDebugger.recordEvent({
          severity: 'warn',
          scope: 'update',
          message: 'Settings update request failed; falling back to local state',
          details: serializeError(apiErr),
        })
        // Don't throw here - we'll update local state anyway
      }

      setSettings(updatedSettings)
      settingsDebugger.updateSnapshot({
        settingsPresent: !!updatedSettings,
        settingsKeys: getSettingsKeys(updatedSettings),
      })
      console.log('✅ Settings updated successfully in local state')

      settingsDebugger.recordEvent({
        severity: 'info',
        scope: 'update',
        message: 'Settings updated locally after request',
        details: {
          keyCount: getSettingsKeys(updatedSettings).length,
        },
      })
    } catch (err) {
      console.error('❌ Failed to update settings:', err)
      settingsDebugger.recordEvent({
        severity: 'error',
        scope: 'update',
        message: 'Failed to update settings',
        details: serializeError(err),
      })
      settingsDebugger.updateSnapshot({
        lastIssue: 'Failed to update settings - see error log for details.',
      })
      setError('Failed to save settings')

      throw err
    } finally {
      setSaving(false)
      settingsDebugger.updateSnapshot({ saving: false })
    }
  }

  const refreshSettings = async () => {
    settingsDebugger.recordEvent({
      severity: 'info',
      scope: 'fetch',
      message: 'Manual refresh for frontend settings triggered',
    })
    await fetchSettings()
  }

  useEffect(() => {
    settingsDebugger.recordEvent({
      severity: 'info',
      scope: 'fetch',
      message: 'Initial settings fetch triggered on mount',
    })
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    settings,
    updateSettings,
    refreshSettings,
    loading,
    saving,
    error,
    refetch: fetchSettings
  }
}
