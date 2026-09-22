import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  MinusCircle,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

/**
 * Read-only view over the signup trace.
 *
 * The question this page exists to answer, in one click, is: "this educator is
 * in the incomplete list — what actually happened to them?" Everything here is
 * arranged around that. The journeys list finds the signup, the timeline shows
 * the sequence, and the verdict at the top of the timeline names the failure so
 * nobody has to interpret event names to get the answer.
 */

type Outcome = 'OK' | 'FAIL' | 'SKIP'

interface SignupEventRow {
  id: string
  correlationId: string
  event: string
  stage: string
  source: string
  outcome: Outcome
  role?: string | null
  userId?: string | null
  email?: string | null
  approvalStatusBefore?: string | null
  approvalStatusAfter?: string | null
  detail?: Record<string, unknown> | null
  errorCode?: string | null
  errorMessage?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
}

interface Journey {
  correlationId: string
  startedAt: string
  lastAt: string
  eventCount: number
  failures: number
  role?: string | null
  email?: string | null
  userId?: string | null
  lastEvent: string
  finalStatus?: string | null
}

/**
 * Plain-language names. The stored event names are stable identifiers meant for
 * querying; these are what a human reads.
 */
const EVENT_LABELS: Record<string, string> = {
  'client.wizard_started': 'Signup started (role chosen)',
  'client.account_submitted': 'Account details submitted to Clerk',
  'client.verification_sent': 'Verification email sent',
  'client.verification_submitted': 'Verification code entered',
  'client.account_failed': 'Account creation failed',
  'client.step3_entered': 'Reached profile step',
  'client.draft_saved': 'Profile draft saved locally',
  'client.draft_restored': 'Profile draft restored',
  'client.draft_missing': 'No profile draft found',
  'client.profile_submit_attempt': 'Profile submit attempted',
  'client.profile_submit_retry': 'Profile submit retried after failure',
  'client.profile_submit_failed': 'Profile submit gave up after retries',
  'client.profile_submit_succeeded': 'Profile submit succeeded',
  'client.wizard_abandoned': 'Left the profile step without saving',
  'webhook.user_created_received': 'Clerk webhook received',
  'webhook.role_resolved': 'Role resolved from metadata',
  'webhook.role_missing': 'No role in metadata — account not created',
  'webhook.account_created': 'Backend account created',
  'webhook.intent_applied': 'Signup form details applied',
  'webhook.failed': 'Webhook failed — no account created',
  'api.complete_profile_received': 'Profile completion request received',
  'api.complete_profile_succeeded': 'Account created via profile completion',
  'api.complete_profile_failed': 'Profile completion failed',
  'api.principal_bootstrapped': 'Profile bootstrapped on first request',
  'api.educator_patch_received': 'Profile save request received by API',
  'api.educator_promoted': 'Application submitted — moved to Pending Review',
  'api.educator_promotion_skipped': 'Profile saved but NOT moved to Pending Review',
  'api.educator_reverted_to_incomplete': 'Profile emptied — sent back to Incomplete',
  'api.educator_cv_deleted': 'CV deleted',
  'admin.educator_approved': 'Approved by admin',
  'admin.educator_rejected': 'Rejected by admin',
  'admin.decision_blocked_incomplete': 'Admin blocked: profile is incomplete',
  'system.stuck_incomplete': 'Still incomplete after 24h (daily sweep)',
}

function label(event: string): string {
  return EVENT_LABELS[event] ?? event
}

/**
 * Turn a timeline into a one-line verdict.
 *
 * Deliberately ordered most-specific first: a journey can carry several signals
 * and the earliest matching rule is the one that explains the outcome. If none
 * match the journey did not fail, so it says so rather than inventing a cause.
 */
function diagnose(events: SignupEventRow[]): { verdict: string; tone: 'bad' | 'warn' | 'good' } {
  const has = (name: string) => events.some((e) => e.event === name)

  if (has('api.educator_promoted') && !has('api.educator_reverted_to_incomplete')) {
    return { verdict: 'Application was submitted successfully.', tone: 'good' }
  }
  if (has('api.educator_reverted_to_incomplete') || has('api.educator_cv_deleted')) {
    return {
      verdict:
        'The profile was submitted and then emptied — clearing the bio and CV sends an account back to Incomplete.',
      tone: 'bad',
    }
  }
  if (has('api.educator_patch_received') && has('api.educator_promotion_skipped')) {
    const skipped = events.find((e) => e.event === 'api.educator_promotion_skipped')
    if (skipped?.errorCode === 'NOT_AN_APPLICATION') {
      return {
        verdict:
          'A profile save reached the API but carried neither a bio nor a CV, so it could not count as an application. This is a form/validation problem, not user drop-off.',
        tone: 'bad',
      }
    }
    return {
      verdict: 'A profile save reached the API but the account was not Incomplete at the time.',
      tone: 'warn',
    }
  }
  if (has('client.profile_submit_failed')) {
    return {
      verdict:
        'The educator pressed Complete Setup and every retry failed — their data never reached the API. This is a backend/connectivity failure, not abandonment.',
      tone: 'bad',
    }
  }
  if (has('client.wizard_abandoned') && !has('client.profile_submit_attempt')) {
    return {
      verdict:
        'The educator reached the profile step and left without ever pressing Complete Setup.',
      tone: 'warn',
    }
  }
  if (has('client.draft_missing') && has('client.step3_entered')) {
    return {
      verdict:
        'The educator returned to the profile step but their saved draft could not be found — local persistence failed for this user.',
      tone: 'bad',
    }
  }
  if (has('webhook.role_missing')) {
    return {
      verdict:
        'The Clerk webhook carried no role, so no backend account was created. Expected for OAuth; a bug for email/password signups.',
      tone: 'warn',
    }
  }
  if (has('webhook.failed') || has('api.complete_profile_failed')) {
    return { verdict: 'Account creation failed on the server.', tone: 'bad' }
  }
  if (has('client.step3_entered') && !has('api.educator_patch_received')) {
    return {
      verdict:
        'The educator reached the profile step but no save request ever arrived at the API.',
      tone: 'bad',
    }
  }
  if (has('system.stuck_incomplete')) {
    return {
      verdict:
        'Flagged by the daily sweep as stuck at Incomplete, with no earlier events explaining why — the signup predates this log, or the browser events never arrived.',
      tone: 'warn',
    }
  }
  return { verdict: 'No failure recorded for this journey.', tone: 'good' }
}

const OUTCOME_STYLES: Record<Outcome, { icon: React.ElementType; className: string }> = {
  OK: { icon: CheckCircle2, className: 'text-emerald-600' },
  FAIL: { icon: XCircle, className: 'text-red-600' },
  SKIP: { icon: MinusCircle, className: 'text-amber-600' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

const SignupDiagnostics: React.FC = () => {
  const apiClient = useApiClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedCorrelationId = searchParams.get('cid') ?? ''
  const selectedUserId = searchParams.get('userId') ?? ''
  const [emailFilter, setEmailFilter] = useState('')
  const [onlyFailed, setOnlyFailed] = useState(true)
  const [days, setDays] = useState(30)

  const journeysQuery = useQuery({
    queryKey: ['signup-journeys', onlyFailed, days],
    queryFn: async () => {
      const res = await apiService.getSignupJourneys(apiClient, { onlyFailed, days, limit: 100 })
      return ((res.data as any)?.journeys ?? []) as Journey[]
    },
  })

  const funnelQuery = useQuery({
    queryKey: ['signup-funnel', days],
    queryFn: async () => {
      const res = await apiService.getSignupFunnel(apiClient, { days })
      return ((res.data as any)?.funnel ?? []) as Array<Record<string, any>>
    },
  })

  const timelineQuery = useQuery({
    queryKey: ['signup-timeline', selectedCorrelationId, selectedUserId],
    enabled: Boolean(selectedCorrelationId || selectedUserId),
    queryFn: async () => {
      const res = selectedUserId
        ? await apiService.getSignupTimelineForUser(apiClient, selectedUserId)
        : await apiService.getSignupTimeline(apiClient, selectedCorrelationId)
      return ((res.data as any)?.events ?? []) as SignupEventRow[]
    },
  })

  const journeys = journeysQuery.data ?? []
  const visibleJourneys = useMemo(() => {
    const needle = emailFilter.trim().toLowerCase()
    if (!needle) return journeys
    return journeys.filter((j) => (j.email ?? '').toLowerCase().includes(needle))
  }, [journeys, emailFilter])

  const timeline = timelineQuery.data ?? []
  const diagnosis = timeline.length > 0 ? diagnose(timeline) : null

  const select = (journey: Journey) => {
    setSearchParams({ cid: journey.correlationId })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Signup Diagnostics</h1>
        <p className="text-sm text-gray-600 mt-1">
          Every step of every signup, from the role being chosen in the browser to the
          admin decision. Use this to find out why an account ended up in the incomplete
          list instead of the review queue.
        </p>
      </div>

      {/* Funnel — the all-roles answer. An educator-only drop-off looks very
          different here from a platform-wide one. */}
      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Last {days} days, by role
        </h2>
        {funnelQuery.isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Started</th>
                  <th className="py-2 pr-4 font-medium">Account created</th>
                  <th className="py-2 pr-4 font-medium">Profile submitted</th>
                  <th className="py-2 pr-4 font-medium">Submit failed</th>
                  <th className="py-2 pr-4 font-medium">Abandoned</th>
                  <th className="py-2 pr-4 font-medium">Stuck incomplete</th>
                </tr>
              </thead>
              <tbody>
                {(funnelQuery.data ?? []).map((row) => (
                  <tr key={row.role} className="border-t border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">{row.role}</td>
                    <td className="py-2 pr-4">{row.started}</td>
                    <td className="py-2 pr-4">{row.accountCreated}</td>
                    <td className="py-2 pr-4">{row.profileSubmitted}</td>
                    <td className="py-2 pr-4 text-red-600">{row.submitFailed}</td>
                    <td className="py-2 pr-4 text-amber-600">{row.abandoned}</td>
                    <td className="py-2 pr-4 text-red-600">{row.stuckIncomplete}</td>
                  </tr>
                ))}
                {(funnelQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-gray-500">
                      No signup activity recorded in this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-3">
              Only educators have a separate &ldquo;profile submitted&rdquo; step — every
              other role finishes at account creation, which is why only educators can
              appear in the incomplete list.
            </p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Journeys */}
        <section className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Signup journeys</h2>
              <button
                type="button"
                onClick={() => journeysQuery.refetch()}
                className="text-gray-500 hover:text-gray-900"
                aria-label="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  placeholder="Filter by email"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={onlyFailed}
                  onChange={(e) => setOnlyFailed(e.target.checked)}
                />
                Problems only
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="border border-gray-300 rounded-md text-sm py-2 px-2"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100">
            {journeysQuery.isLoading && (
              <div className="p-6">
                <LoadingSpinner />
              </div>
            )}
            {!journeysQuery.isLoading && visibleJourneys.length === 0 && (
              <p className="p-6 text-sm text-gray-500">
                Nothing recorded for these filters.
              </p>
            )}
            {visibleJourneys.map((journey) => (
              <button
                key={journey.correlationId}
                type="button"
                onClick={() => select(journey)}
                className={`w-full text-left p-4 hover:bg-gray-50 flex items-start gap-3 ${
                  journey.correlationId === selectedCorrelationId ? 'bg-gray-50' : ''
                }`}
              >
                <div className="mt-0.5">
                  {journey.failures > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {journey.email ?? 'Unknown email'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {journey.role ?? 'Role unknown'} · {label(journey.lastEvent)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(journey.startedAt)} · {journey.eventCount} events
                    {journey.failures > 0 ? ` · ${journey.failures} failed` : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
              </button>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Timeline</h2>
            {(selectedCorrelationId || selectedUserId) && (
              <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                {selectedUserId ? `user ${selectedUserId}` : selectedCorrelationId}
              </p>
            )}
          </div>

          {!selectedCorrelationId && !selectedUserId && (
            <p className="p-6 text-sm text-gray-500">
              Pick a signup on the left to see what happened to it.
            </p>
          )}

          {timelineQuery.isLoading && (
            <div className="p-6">
              <LoadingSpinner />
            </div>
          )}

          {diagnosis && (
            <div
              className={`m-4 p-3 rounded-md text-sm ${
                diagnosis.tone === 'bad'
                  ? 'bg-red-50 text-red-800'
                  : diagnosis.tone === 'warn'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              <span className="font-medium">Diagnosis: </span>
              {diagnosis.verdict}
            </div>
          )}

          <ol className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
            {timeline.map((event) => {
              const style = OUTCOME_STYLES[event.outcome] ?? OUTCOME_STYLES.OK
              const Icon = style.icon
              return (
                <li key={event.id} className="p-4 flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">{label(event.event)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(event.createdAt)} · {event.source}
                      {event.approvalStatusBefore || event.approvalStatusAfter
                        ? ` · ${event.approvalStatusBefore ?? '—'} → ${event.approvalStatusAfter ?? '—'}`
                        : ''}
                    </p>
                    {event.errorMessage && (
                      <p className="text-xs text-red-700 mt-1 break-words">
                        {event.errorCode ? `${event.errorCode}: ` : ''}
                        {event.errorMessage}
                      </p>
                    )}
                    {event.detail && Object.keys(event.detail).length > 0 && (
                      <pre className="text-[11px] text-gray-600 bg-gray-50 rounded p-2 mt-2 overflow-x-auto">
                        {JSON.stringify(event.detail, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default SignupDiagnostics
