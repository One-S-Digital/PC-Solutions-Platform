import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bug, ChevronDown, ChevronUp, Copy, Info } from 'lucide-react'
import settingsDebugger, {
  SettingsDebuggerState,
  SettingsDebugEvent,
  SettingsDebugInsight,
} from '../../debug/settingsDebugger'

const formatBoolean = (value: boolean | null) => {
  if (value === null || value === undefined) {
    return 'n/a'
  }

  return value ? 'true' : 'false'
}

const formatRelativeTime = (timestamp: number | null) => {
  if (!timestamp) {
    return '—'
  }

  const deltaMs = Date.now() - timestamp

  if (deltaMs < 0) {
    return new Date(timestamp).toLocaleTimeString()
  }

  const seconds = Math.round(deltaMs / 1000)
  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const formatEventTimestamp = (timestamp: number) => {
  const time = new Date(timestamp)
  return `${time.toLocaleTimeString()} (${formatRelativeTime(timestamp)})`
}

const getInsightIcon = (severity: SettingsDebugInsight['severity']) => {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <Info className="h-4 w-4 text-swiss-teal" />
  }
}

const getInsightStyles = (severity: SettingsDebugInsight['severity']) => {
  switch (severity) {
    case 'critical':
      return 'border-red-200 bg-red-50'
    case 'warning':
      return 'border-amber-200 bg-amber-50'
    default:
      return 'border-swiss-teal/40 bg-white'
  }
}

const summariseDetails = (details?: SettingsDebugEvent['details']) => {
  if (!details) {
    return null
  }

  try {
    const json = JSON.stringify(details, null, 2)
    if (json.length > 800) {
      return `${json.slice(0, 780)}…`
    }
    return json
  } catch (error) {
    return 'Unable to render event details.'
  }
}

const SettingsDebugPanel: React.FC = () => {
  const [state, setState] = useState<SettingsDebuggerState>(() => settingsDebugger.getState())
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsubscribe = settingsDebugger.subscribe((nextState) => {
      setState(nextState)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (!settingsDebugger.isAvailable()) {
    return null
  }

  const eventsToDisplay = useMemo(() => {
    return state.events.slice().reverse().slice(0, 30)
  }, [state.events])

  const hasCriticalInsight = state.insights.some((insight) => insight.severity === 'critical')

  const snapshotStats = [
    { label: 'Skip Auth', value: formatBoolean(state.snapshot.skipAuth) },
    { label: 'Has API Client', value: formatBoolean(state.snapshot.hasApiClient) },
    { label: 'Loading', value: formatBoolean(state.snapshot.loading) },
    { label: 'Saving', value: formatBoolean(state.snapshot.saving) },
    { label: 'Fetch Attempts', value: state.snapshot.fetchAttempts },
    { label: 'Successes', value: state.snapshot.fetchSuccesses },
    { label: 'Failures', value: state.snapshot.fetchFailures },
    { label: 'Last Status', value: state.snapshot.lastFetchStatus ?? '—' },
    { label: 'Last Transport', value: state.snapshot.lastFetchTransport ?? '—' },
    {
      label: 'Last Duration',
      value:
        state.snapshot.lastFetchDurationMs !== null
          ? `${state.snapshot.lastFetchDurationMs}ms`
          : '—',
    },
    { label: 'Last Success', value: formatRelativeTime(state.snapshot.lastSuccessTimestamp) },
    { label: 'Last Issue', value: state.snapshot.lastIssue ?? '—' },
  ]

  const copyPayload = {
    snapshot: state.snapshot,
    insights: state.insights,
    events: state.events.slice(-100),
  }

  const handleCopy = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        console.warn('[settings-debugger] Clipboard API unavailable')
        return
      }

      await navigator.clipboard.writeText(JSON.stringify(copyPayload, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('[settings-debugger] Failed to copy debugger payload', error)
    }
  }

  const forced = settingsDebugger.isForceEnabled()

  if (!state.enabled) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <Bug className="mt-1 h-5 w-5 text-gray-500" />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-swiss-charcoal">Settings Debugger</h3>
              <p className="mt-1 text-xs text-gray-500">
                Activate the debugger to trace the settings loading flow, network responses, and
                authentication state without touching production logging.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Tip: append <span className="font-mono text-[11px] text-gray-600">?debugSettings=1</span>{' '}
              to the URL to auto-enable, even outside development builds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => settingsDebugger.setEnabled(true)}
            className="inline-flex items-center rounded-md bg-swiss-teal px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-swiss-teal/90"
          >
            Enable
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mt-8 rounded-lg border ${
        hasCriticalInsight ? 'border-red-300 bg-red-50' : 'border-swiss-teal/40 bg-swiss-teal/5'
      } p-5 shadow-sm`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-swiss-charcoal">
          <Bug className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Settings Debugger</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-swiss-teal/40 bg-white px-3 py-1 text-xs font-medium text-swiss-charcoal transition hover:border-swiss-teal/80"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy Snapshot'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-swiss-teal/40 bg-white px-3 py-1 text-xs font-medium text-swiss-charcoal transition hover:border-swiss-teal/80"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Expand
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => settingsDebugger.setEnabled(false)}
            disabled={forced}
            className={`inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1 text-xs font-medium transition ${
              forced
                ? 'cursor-not-allowed bg-red-100/40 text-red-400'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
            title={forced ? 'Debugger forced via query parameter; remove it to disable.' : 'Disable debugger'}
          >
            Disable
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-swiss-charcoal">Insights</h4>
              <span className="rounded-full bg-swiss-teal/10 px-2 py-0.5 text-[11px] font-medium text-swiss-teal">
                {state.insights.length}
              </span>
            </div>
            {state.insights.length === 0 ? (
              <div className="rounded-md border border-dashed border-swiss-teal/30 bg-white p-3 text-xs text-gray-500">
                No blocking issues detected. The debugger continuously watches for fetch failures,
                missing auth tokens, and other anomalies.
              </div>
            ) : (
              <div className="space-y-3">
                {state.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${getInsightStyles(
                      insight.severity,
                    )}`}
                  >
                    {getInsightIcon(insight.severity)}
                    <div className="space-y-1">
                      <p className="font-medium text-swiss-charcoal">{insight.title}</p>
                      <p className="text-xs text-gray-600">{insight.detail}</p>
                      {insight.recommendation && (
                        <p className="text-xs text-gray-500">
                          Recommendation: <span className="font-medium">{insight.recommendation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-swiss-charcoal">Snapshot</h4>
            <dl className="grid grid-cols-2 gap-3 text-xs text-gray-600 md:grid-cols-3">
              {snapshotStats.map((stat) => (
                <div key={stat.label} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                  <dt className="font-medium text-swiss-charcoal">{stat.label}</dt>
                  <dd className="mt-1 font-mono text-[12px] text-gray-700">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-swiss-charcoal">Timeline</h4>
              <span className="text-[11px] text-gray-500">Showing latest {eventsToDisplay.length} events</span>
            </div>
            {eventsToDisplay.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-500">
                No debugger events recorded yet. Trigger a fetch or settings update to see the
                sequence.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white">
                <ul className="divide-y divide-gray-100 text-xs text-gray-700">
                  {eventsToDisplay.map((event) => (
                    <li key={event.id} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            event.severity === 'error'
                              ? 'bg-red-100 text-red-700'
                              : event.severity === 'warn'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-swiss-teal/10 text-swiss-teal'
                          }`}
                        >
                          {event.scope.toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-800">{event.message}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <span>{formatEventTimestamp(event.timestamp)}</span>
                      </div>
                      {summariseDetails(event.details) && (
                        <pre className="mt-2 whitespace-pre-wrap break-all rounded border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-600">
                          {summariseDetails(event.details)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default SettingsDebugPanel
