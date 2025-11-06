import type { AxiosError } from 'axios'

export type SettingsDebugEventSeverity = 'info' | 'warn' | 'error'
export type SettingsDebugInsightSeverity = 'critical' | 'warning' | 'info'

export interface SettingsDebugEvent {
  id: string
  timestamp: number
  severity: SettingsDebugEventSeverity
  scope: 'debugger' | 'hook' | 'fetch' | 'network' | 'update' | 'auth' | 'analysis' | 'inspector'
  message: string
  details?: Record<string, unknown>
}

export interface SettingsDebugSnapshot {
  skipAuth: boolean | null
  hasApiClient: boolean | null
  loading: boolean
  saving: boolean
  error: string | null
  lastIssue: string | null
  settingsPresent: boolean
  settingsKeys: string[]
  lastFetchTransport: 'axios' | 'fetch' | null
  lastFetchStatus: number | null
  lastFetchDurationMs: number | null
  lastSuccessTimestamp: number | null
  lastErrorTimestamp: number | null
  fetchAttempts: number
  fetchSuccesses: number
  fetchFailures: number
  env: {
    mode?: string
    apiBaseUrl?: string | null
  }
}

export interface SettingsDebugInsight {
  id: string
  severity: SettingsDebugInsightSeverity
  title: string
  detail: string
  recommendation?: string
  relatedEventId?: string
}

export interface SettingsDebuggerState {
  enabled: boolean
  snapshot: SettingsDebugSnapshot
  events: SettingsDebugEvent[]
  insights: SettingsDebugInsight[]
}

const MAX_EVENTS = 200
const isDevBuild = import.meta.env.DEV
const initialSnapshot: SettingsDebugSnapshot = {
  skipAuth: null,
  hasApiClient: null,
  loading: false,
  saving: false,
  error: null,
  lastIssue: null,
  settingsPresent: false,
  settingsKeys: [],
  lastFetchTransport: null,
  lastFetchStatus: null,
  lastFetchDurationMs: null,
  lastSuccessTimestamp: null,
  lastErrorTimestamp: null,
  fetchAttempts: 0,
  fetchSuccesses: 0,
  fetchFailures: 0,
  env: {
    mode: import.meta.env.MODE,
    apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
  },
}

const isBrowser = typeof window !== 'undefined'

const computeInitialEnablement = () => {
  if (!isBrowser) return false
  const params = new URLSearchParams(window.location.search)
  const forced = params.has('debugSettings') || params.get('debug') === 'settings'
  if (forced) return true

  const stored = window.localStorage?.getItem('settings-debugger-enabled')
  if (stored === 'true') {
    return true
  }

  if (stored === 'false') {
    return false
  }

  if (isDevBuild) {
    return true
  }

  return false
}

const computeIsForceEnabled = () => {
  if (!isBrowser) return false
  const params = new URLSearchParams(window.location.search)
  return params.has('debugSettings') || params.get('debug') === 'settings'
}

export interface SerializedErrorPayload {
  name?: string
  message?: string
  stack?: string
  status?: number
  code?: string
  config?: Record<string, unknown>
  response?: Record<string, unknown>
  data?: unknown
  cause?: unknown
  original?: unknown
}

export const serializeError = (error: unknown): SerializedErrorPayload => {
  if (!error) {
    return { message: 'Unknown error' }
  }

  if (error instanceof Error) {
    const base: SerializedErrorPayload = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }

    const axiosError = error as AxiosError
    if (axiosError?.isAxiosError) {
      base.status = axiosError.response?.status
      base.code = axiosError.code
      base.response = axiosError.response
        ? {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
            headers: axiosError.response.headers,
          }
        : undefined
      base.config = axiosError.config
        ? {
            url: axiosError.config.url,
            method: axiosError.config.method,
            headers: axiosError.config.headers,
            timeout: axiosError.config.timeout,
            baseURL: axiosError.config.baseURL,
          }
        : undefined
    }

    const anyError = error as Error & { cause?: unknown }
    if (anyError.cause) {
      base.cause = serializeError(anyError.cause)
    }

    return base
  }

  if (typeof error === 'object') {
    try {
      return {
        data: JSON.parse(JSON.stringify(error)),
      }
    } catch (jsonError) {
      return {
        original: error,
        message: jsonError instanceof Error ? jsonError.message : 'Failed to serialise error object',
      }
    }
  }

  return { message: String(error) }
}

class SettingsDebugger {
  private enabled = computeInitialEnablement()
  private forced = computeIsForceEnabled()
  private events: SettingsDebugEvent[] = []
  private snapshot: SettingsDebugSnapshot = { ...initialSnapshot }
  private insights: SettingsDebugInsight[] = []
  private listeners = new Set<(state: SettingsDebuggerState) => void>()
  private idCounter = 0

  constructor() {
    if (this.enabled) {
      this.recordEvent({
        severity: 'info',
        scope: 'debugger',
        message: 'Settings debugger initialised',
        details: {
          forced: this.forced,
          mode: this.snapshot.env.mode,
          apiBaseUrl: this.snapshot.env.apiBaseUrl,
        },
      })
    }
  }

  isAvailable() {
    return isBrowser
  }

  isEnabled() {
    return this.enabled
  }

  isForceEnabled() {
    return this.forced
  }

  toggle() {
    this.setEnabled(!this.enabled)
  }

  setEnabled(value: boolean) {
    if (value === this.enabled) {
      return
    }

    if (!this.isAvailable()) {
      return
    }

    if (this.forced && !value) {
      console.warn('[settings-debugger] Cannot disable debugger while forced via query parameters.')
      return
    }

    this.enabled = value

    if (isBrowser) {
      if (value) {
        window.localStorage?.setItem('settings-debugger-enabled', 'true')
      } else {
        window.localStorage?.setItem('settings-debugger-enabled', 'false')
      }
    }

    this.recordEvent({
      severity: 'info',
      scope: 'debugger',
      message: value ? 'Settings debugger enabled' : 'Settings debugger disabled',
    })

    this.emit()
  }

  getState(): SettingsDebuggerState {
    return {
      enabled: this.enabled,
      snapshot: {
        ...this.snapshot,
        env: { ...this.snapshot.env },
      },
      events: [...this.events],
      insights: [...this.insights],
    }
  }

  subscribe(listener: (state: SettingsDebuggerState) => void) {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  recordEvent(event: Omit<SettingsDebugEvent, 'id' | 'timestamp'> & { timestamp?: number }) {
    const newEvent: SettingsDebugEvent = {
      ...event,
      id: this.generateId(),
      timestamp: event.timestamp ?? Date.now(),
    }

    this.events = [...this.events.slice(-MAX_EVENTS + 1), newEvent]

    const shouldLogToConsole = this.enabled

    if (shouldLogToConsole) {
      const prefix = `[settings-debugger][${newEvent.scope}]`
      if (newEvent.severity === 'error') {
        console.error(prefix, newEvent.message, newEvent.details ?? '')
      } else if (newEvent.severity === 'warn') {
        console.warn(prefix, newEvent.message, newEvent.details ?? '')
      } else {
        console.log(prefix, newEvent.message, newEvent.details ?? '')
      }
    }

    this.recalculateInsights()
    this.emit()

    return newEvent.id
  }

  updateSnapshot(partial: Partial<SettingsDebugSnapshot>) {
    const { env, ...rest } = partial
    this.snapshot = {
      ...this.snapshot,
      ...rest,
      env: env ? { ...this.snapshot.env, ...env } : { ...this.snapshot.env },
    }

    this.recalculateInsights()
    this.emit()
  }

  clear() {
    this.events = []
    this.snapshot = { ...initialSnapshot }
    this.recalculateInsights()
    this.emit()
  }

  private recalculateInsights() {
    const insights: SettingsDebugInsight[] = []
    const { snapshot, events } = this
    const latestErrorEvent = [...events].reverse().find((event) => event.severity === 'error')

    if (snapshot.error) {
      insights.push({
        id: this.generateId(),
        severity: 'critical',
        title: 'Settings hook reported an error',
        detail: snapshot.error,
        recommendation: 'Inspect API availability and Clerk authentication; check network logs for the failing request.',
      })
    }

    if (!snapshot.loading && snapshot.fetchAttempts > 0 && snapshot.fetchSuccesses === 0) {
      insights.push({
        id: this.generateId(),
        severity: 'critical',
        title: 'Settings data never loaded successfully',
        detail:
          snapshot.lastFetchStatus !== null
            ? `Last request ended with status ${snapshot.lastFetchStatus}.`
            : 'No successful responses recorded yet.',
        recommendation: 'Verify the /admin/frontend-settings endpoint and confirm authentication headers are accepted.',
        relatedEventId: latestErrorEvent?.id,
      })
    }

    if (!snapshot.skipAuth && snapshot.hasApiClient === false) {
      insights.push({
        id: this.generateId(),
        severity: 'critical',
        title: 'API client unavailable while auth is required',
        detail:
          'Clerk authentication is enabled but useApiClient returned no client. Tokens may be missing or Clerk configuration is invalid.',
        recommendation: 'Confirm Clerk publishable key and admin auth configuration.',
      })
    }

    if (snapshot.fetchFailures > 0 && snapshot.fetchFailures === snapshot.fetchAttempts) {
      insights.push({
        id: this.generateId(),
        severity: 'warning',
        title: 'All settings fetch attempts have failed',
        detail: `Attempts: ${snapshot.fetchAttempts}, Failures: ${snapshot.fetchFailures}.`,
        recommendation: 'Check API service logs for repeated failures. Consider enabling network tab capture.',
        relatedEventId: latestErrorEvent?.id,
      })
    }

    if (snapshot.lastIssue) {
      insights.push({
        id: this.generateId(),
        severity: 'warning',
        title: 'Debugger recorded the latest issue',
        detail: snapshot.lastIssue,
        relatedEventId: latestErrorEvent?.id,
      })
    }

    if (latestErrorEvent && !insights.some((insight) => insight.relatedEventId === latestErrorEvent.id)) {
      insights.push({
        id: this.generateId(),
        severity: 'warning',
        title: 'Latest error event',
        detail: latestErrorEvent.message,
        relatedEventId: latestErrorEvent.id,
      })
    }

    this.insights = insights
  }

  private emit() {
    const state = this.getState()
    this.listeners.forEach((listener) => {
      try {
        listener(state)
      } catch (error) {
        console.error('[settings-debugger] Listener failed', error)
      }
    })
  }

  private generateId() {
    this.idCounter = (this.idCounter + 1) % Number.MAX_SAFE_INTEGER
    return `${Date.now().toString(36)}-${this.idCounter.toString(36)}`
  }
}

const settingsDebugger = new SettingsDebugger()

if (isBrowser) {
  ;(window as typeof window & { settingsDebugger?: SettingsDebugger }).settingsDebugger = settingsDebugger
}

export default settingsDebugger
