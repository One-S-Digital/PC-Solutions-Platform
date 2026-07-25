import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Brain,
  Activity,
  DollarSign,
  ShieldCheck,
  BookOpen,
  Settings,
  FileSearch,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Zap,
  BarChart2,
  Clock,
  Database,
} from 'lucide-react'
import { useApiClient } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Tabs from '../components/design-system/Tabs'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverviewData {
  foundation: { enabled: boolean; flagId: string | null }
  openrouter: { configured: boolean; circuitBreakerOpen: boolean; callsToday: number }
  voyage: { configured: boolean }
  stats: {
    callsToday: number
    inputTokensToday: number
    outputTokensToday: number
    costTodayUsd: number
    cacheHitRate: number
    fallbackRate: number
  }
  recentLogs: RecentLog[]
}

interface RecentLog {
  id: string
  agentName: string
  model: string
  principalId: string | null
  organizationId: string | null
  tokenUsage: { input?: number; output?: number }
  costUsd: number
  latencyMs: number
  cacheHit: boolean
  fallbackUsed: boolean
  createdAt: string
}

interface AgentSummary {
  name: string
  models: string[]
  allowedRoles: string[]
  scopeRule: string
  maxOutputTokens: number
  dailyTokenBudget: number | null
  activePromptVersion: string
  stats: {
    callsToday: number
    costTodayUsd: number
    avgLatencyMs: number
    cacheHitRate: number
    fallbackRate: number
  }
}

interface AuditLog {
  id: string
  agentName: string
  promptVersion: string
  model: string
  fallbackUsed: boolean
  inputHash: string
  outputHash: string | null
  tokenUsage: { input?: number; output?: number }
  costUsd: number
  latencyMs: number
  cacheHit: boolean
  principalId: string | null
  organizationId: string | null
  entityRef: string | null
  retrievedDocIds: string[]
  agentRunId: string | null
  createdAt: string
}

interface AuditLogResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface CostData {
  mtdCostUsd: number
  topAgents: { agentName: string; costUsd: number; calls: number }[]
  dailyChart: { date: string; totalCost: number; byAgent: Record<string, number> }[]
}

interface KnowledgeDoc {
  id: string
  source: string
  cantonScope: string | null
  locale: string
  audience: string | null
  version: number
  title: string
  createdAt: string
  updatedAt: string
}

interface SafetyData {
  activeConsents: number
  revokedConsents: number
  recentRevocations: { id: string; userId: string; revokedAt: string; version: number }[]
}

interface EnvCheck {
  OPENROUTER_API_KEY: boolean
  VOYAGE_API_KEY: boolean
  MAPBOX_API_KEY: boolean
  REDIS_URL: boolean
  DATABASE_URL: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = {
  usd: (n: number) => `$${n.toFixed(4)}`,
  tokens: (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n),
  pct: (n: number) => `${n.toFixed(1)}%`,
  ms: (n: number) => `${n}ms`,
  time: (iso: string) => new Date(iso).toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  date: (iso: string) => new Date(iso).toLocaleDateString('en-CH'),
}

const StatusDot: React.FC<{ ok: boolean; warn?: boolean }> = ({ ok, warn }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0 ${ok ? 'bg-green-500' : warn ? 'bg-yellow-500' : 'bg-red-500'}`} />
)

const EnvPill: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
    {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
    {label}
  </div>
)

const StatTile: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean }> = ({ icon: Icon, label, value, sub, accent }) => (
  <Card className={`p-5 flex items-start gap-4 ${accent ? 'border-l-4 border-l-red-400' : ''}`}>
    <div className="p-2.5 rounded-lg bg-swiss-teal/10">
      <Icon className="w-5 h-5 text-swiss-teal" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-swiss-charcoal mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </Card>
)

const EmptyState: React.FC<{ title: string; description: string; icon?: React.ElementType }> = ({ title, description, icon: Icon = Database }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 rounded-full bg-gray-100 mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 max-w-sm">{description}</p>
  </div>
)

// ─── Tab: Overview ───────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery<OverviewData>({
    queryKey: ['ai-admin-overview'],
    queryFn: async () => (await apiClient.get('/ai/admin/overview')).data,
    enabled: !!apiClient,
    refetchInterval: 15000,
    staleTime: 10000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      apiClient.patch('/ai/admin/flag', { flagId, enabled }),
    onSuccess: (_, { enabled }) => {
      toast.success(`AI Foundation ${enabled ? 'enabled' : 'disabled'}`)
      qc.invalidateQueries({ queryKey: ['ai-admin-overview'] })
    },
    onError: () => toast.error('Failed to update flag'),
  })

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (error || !data) return (
    <EmptyState title="Could not load overview" description="No AI data yet. Once agents start running, stats will appear here." icon={Activity} />
  )

  const handleToggle = () => {
    if (!data.foundation.flagId) return toast.error('Feature flag not seeded — run the DB seed first')
    if (!data.foundation.enabled) {
      toggleMutation.mutate({ flagId: data.foundation.flagId, enabled: true })
    } else {
      if (!window.confirm('Disable AI Foundation? This stops all AI calls platform-wide.')) return
      toggleMutation.mutate({ flagId: data.foundation.flagId, enabled: false })
    }
  }

  const { stats } = data

  return (
    <div className="space-y-6">
      {/* Status strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`p-4 ${!data.foundation.enabled ? 'border-l-4 border-l-red-400' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">AI Foundation</p>
              <div className="flex items-center">
                <StatusDot ok={data.foundation.enabled} />
                <span className={`text-sm font-semibold ${data.foundation.enabled ? 'text-green-700' : 'text-red-600'}`}>
                  {data.foundation.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">key: ai_foundation_enabled</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                data.foundation.enabled
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {toggleMutation.isPending ? '…' : data.foundation.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </Card>

        <Card className={`p-4 ${data.openrouter.circuitBreakerOpen ? 'border-l-4 border-l-red-400' : ''}`}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">OpenRouter</p>
          <div className="flex items-center mb-1">
            <StatusDot ok={data.openrouter.configured && !data.openrouter.circuitBreakerOpen} warn={data.openrouter.configured && data.openrouter.circuitBreakerOpen} />
            <span className="text-sm font-semibold text-swiss-charcoal">
              {!data.openrouter.configured ? 'Not configured' : data.openrouter.circuitBreakerOpen ? 'Circuit open' : 'Up'}
            </span>
          </div>
          <p className="text-xs text-gray-400">{fmt.tokens(data.openrouter.callsToday)} calls today</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Voyage Embeddings</p>
          <div className="flex items-center mb-1">
            <StatusDot ok={data.voyage.configured} />
            <span className="text-sm font-semibold text-swiss-charcoal">
              {data.voyage.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="text-xs text-gray-400">voyage-3-lite</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Cache hit rate</p>
          <p className={`text-xl font-semibold ${stats.cacheHitRate >= 30 ? 'text-green-600' : 'text-yellow-600'}`}>
            {fmt.pct(stats.cacheHitRate)}
          </p>
          <p className="text-xs text-gray-400">
            {stats.fallbackRate > 5 ? <span className="text-yellow-600">⚠ {fmt.pct(stats.fallbackRate)} fallback rate</span> : `${fmt.pct(stats.fallbackRate)} fallback`}
          </p>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Zap} label="Calls today" value={String(stats.callsToday)} />
        <StatTile icon={Activity} label="Tokens today" value={`${fmt.tokens(stats.inputTokensToday)} in`} sub={`${fmt.tokens(stats.outputTokensToday)} out`} />
        <StatTile icon={DollarSign} label="Cost today" value={fmt.usd(stats.costTodayUsd)} accent={stats.costTodayUsd > 5} />
        <StatTile icon={Clock} label="Live feed" value="auto-refresh" sub="every 15s" />
      </div>

      {/* Live activity feed */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Live activity</h3>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-swiss-teal">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {data.recentLogs.length === 0 ? (
        <EmptyState title="No calls yet" description="Agent calls will appear here in real time once the AI Foundation is active." icon={Activity} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Time</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Agent</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Model</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Tokens</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Cost</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Latency</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-500">{fmt.time(log.createdAt)}</td>
                    <td className="px-4 py-2 font-medium text-swiss-charcoal">{log.agentName}</td>
                    <td className="px-4 py-2 text-gray-500 max-w-[140px] truncate">{log.model}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {fmt.tokens((log.tokenUsage?.input ?? 0) + (log.tokenUsage?.output ?? 0))}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{fmt.usd(Number(log.costUsd))}</td>
                    <td className="px-4 py-2 text-gray-500">{fmt.ms(log.latencyMs)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {log.cacheHit && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">cache</span>}
                        {log.fallbackUsed && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-600">fallback</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Tab: Agents ─────────────────────────────────────────────────────────────

const AgentsTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const [selected, setSelected] = useState<AgentSummary | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<AgentSummary[]>({
    queryKey: ['ai-admin-agents'],
    queryFn: async () => (await apiClient.get('/ai/admin/agents')).data,
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const configMutation = useMutation({
    mutationFn: ({ name, body }: { name: string; body: any }) =>
      apiClient.patch(`/ai/admin/agents/${name}/config`, body),
    onSuccess: () => {
      toast.success('Agent config updated')
      qc.invalidateQueries({ queryKey: ['ai-admin-agents'] })
      setSelected(null)
    },
    onError: () => toast.error('Failed to update config'),
  })

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (!data?.length) return <EmptyState title="No agents registered" description="Agents appear here once defined in ai-agents.config.ts." icon={Brain} />

  return (
    <div className="space-y-4">
      {selected && (
        <AgentDetailPanel
          agent={selected}
          onClose={() => setSelected(null)}
          onSave={(body) => configMutation.mutate({ name: selected.name, body })}
          saving={configMutation.isPending}
        />
      )}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Agent</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Primary model</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Prompt</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Calls/24h</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Cost/24h</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Avg latency</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Cache</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Fallback</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(agent => (
                <tr key={agent.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-swiss-charcoal">{agent.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{agent.models[0]}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{agent.activePromptVersion}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{agent.stats.callsToday}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt.usd(agent.stats.costTodayUsd)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt.ms(agent.stats.avgLatencyMs)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-medium ${agent.stats.cacheHitRate >= 30 ? 'text-green-600' : 'text-gray-500'}`}>
                      {fmt.pct(agent.stats.cacheHitRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-medium ${agent.stats.fallbackRate > 10 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {fmt.pct(agent.stats.fallbackRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(agent)}
                      className="text-xs text-swiss-teal hover:underline flex items-center gap-0.5 ml-auto"
                    >
                      Config <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const AgentDetailPanel: React.FC<{
  agent: AgentSummary
  onClose: () => void
  onSave: (body: any) => void
  saving: boolean
}> = ({ agent, onClose, onSave, saving }) => {
  const [promptVersion, setPromptVersion] = useState(agent.activePromptVersion)

  return (
    <Card className="p-5 border border-swiss-teal/30 bg-swiss-teal/5">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-swiss-charcoal">{agent.name}</h3>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">✕ Close</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Model chain</p>
          <div className="space-y-1">
            {agent.models.map((m, i) => (
              <div key={m} className="flex items-center gap-2">
                <span className="text-xs w-14 text-gray-400">{i === 0 ? 'Primary' : i === 1 ? 'Secondary' : 'Tertiary'}</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded truncate max-w-[200px]">{m}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Constraints</p>
          <p className="text-xs">Max output: <span className="font-medium">{agent.maxOutputTokens} tokens</span></p>
          <p className="text-xs">Scope: <span className="font-medium">{agent.scopeRule}</span></p>
          <p className="text-xs">Roles: <span className="font-medium">{agent.allowedRoles.join(', ')}</span></p>
          {agent.dailyTokenBudget && <p className="text-xs">Budget: <span className="font-medium">{fmt.tokens(agent.dailyTokenBudget)}/day</span></p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Active prompt version</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={promptVersion}
              onChange={e => setPromptVersion(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 w-20"
              placeholder="v1"
            />
            <button
              onClick={() => onSave({ promptVersion })}
              disabled={saving || promptVersion === agent.activePromptVersion}
              className="text-xs px-3 py-1.5 bg-swiss-teal text-white rounded hover:bg-swiss-teal/90 disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Saved to AiAgentConfig table</p>
        </div>
      </div>
    </Card>
  )
}

// ─── Tab: Audit Log ───────────────────────────────────────────────────────────

const AuditLogTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const [page, setPage] = useState(1)
  const [agentFilter, setAgentFilter] = useState('')
  const [cacheFilter, setCacheFilter] = useState<string>('')
  const [fallbackFilter, setFallbackFilter] = useState<string>('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const params = new URLSearchParams({ page: String(page), limit: '50' })
  if (agentFilter) params.set('agentName', agentFilter)
  if (cacheFilter !== '') params.set('cacheHit', cacheFilter)
  if (fallbackFilter !== '') params.set('fallbackUsed', fallbackFilter)

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ['ai-admin-audit', page, agentFilter, cacheFilter, fallbackFilter],
    queryFn: async () => (await apiClient.get(`/ai/admin/audit?${params}`)).data,
    enabled: !!apiClient,
    staleTime: 15000,
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by agent"
          value={agentFilter}
          onChange={e => { setAgentFilter(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 w-44"
        />
        <select
          value={cacheFilter}
          onChange={e => { setCacheFilter(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-md px-3 py-2"
        >
          <option value="">All (cache)</option>
          <option value="true">Cache hits</option>
          <option value="false">Cache misses</option>
        </select>
        <select
          value={fallbackFilter}
          onChange={e => { setFallbackFilter(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-md px-3 py-2"
        >
          <option value="">All (fallback)</option>
          <option value="true">Fallbacks only</option>
          <option value="false">Primary model</option>
        </select>
        {data && <p className="text-sm text-gray-500 self-center">{data.total.toLocaleString()} records</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : !data?.logs?.length ? (
        <EmptyState title="No audit logs yet" description="Every AI call is logged here. Start making agent calls to see entries." icon={FileSearch} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Time</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Agent</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Version</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Model</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Tokens</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Cost</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Latency</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.logs.map(log => (
                    <React.Fragment key={log.id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-2 font-mono text-gray-500">{fmt.time(log.createdAt)}</td>
                        <td className="px-4 py-2 font-medium">{log.agentName}</td>
                        <td className="px-4 py-2 text-gray-500">{log.promptVersion}</td>
                        <td className="px-4 py-2 text-gray-500 max-w-[120px] truncate">{log.model}</td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {fmt.tokens((log.tokenUsage?.input ?? 0) + (log.tokenUsage?.output ?? 0))}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">{fmt.usd(Number(log.costUsd))}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{fmt.ms(log.latencyMs)}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {log.cacheHit && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600">cache</span>}
                            {log.fallbackUsed && <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-50 text-yellow-600">fallback</span>}
                          </div>
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr>
                          <td colSpan={8} className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              <div><p className="text-gray-400 mb-0.5">Input hash</p><p className="font-mono text-gray-600 truncate">{log.inputHash}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Output hash</p><p className="font-mono text-gray-600 truncate">{log.outputHash ?? '—'}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Principal</p><p className="text-gray-600">{log.principalId ?? '—'}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Org</p><p className="text-gray-600">{log.organizationId ?? '—'}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Entity ref</p><p className="text-gray-600">{log.entityRef ?? '—'}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Run ID</p><p className="font-mono text-gray-600 truncate">{log.agentRunId ?? '—'}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Retrieved docs</p><p className="text-gray-600">{log.retrievedDocIds?.length ? log.retrievedDocIds.join(', ') : '—'}</p></div>
                              <div><p className="text-gray-400 mb-0.5">Tokens in / out</p><p className="text-gray-600">{log.tokenUsage?.input ?? 0} / {log.tokenUsage?.output ?? 0}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Page {data.page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab: Cost & Budgets ──────────────────────────────────────────────────────

const CostTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const { data, isLoading } = useQuery<CostData>({
    queryKey: ['ai-admin-cost'],
    queryFn: async () => (await apiClient.get('/ai/admin/cost')).data,
    enabled: !!apiClient,
    staleTime: 60000,
  })

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (!data) return <EmptyState title="No cost data yet" description="Cost data accumulates as agents make calls. Check back after the first agent run." icon={DollarSign} />

  const daysElapsed = new Date().getDate()
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const projected = daysElapsed > 0 ? (data.mtdCostUsd / daysElapsed) * daysInMonth : 0

  return (
    <div className="space-y-6">
      {/* Top tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Month-to-date</p>
          <p className="text-3xl font-bold text-swiss-charcoal">{fmt.usd(data.mtdCostUsd)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Projected EOM</p>
          <p className="text-3xl font-bold text-swiss-charcoal">{fmt.usd(projected)}</p>
          <p className="text-xs text-gray-400 mt-1">Based on {daysElapsed}d of {daysInMonth}d elapsed</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total days with data</p>
          <p className="text-3xl font-bold text-swiss-charcoal">{data.dailyChart.length}</p>
        </Card>
      </div>

      {/* Per-agent breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Top agents by cost (30 days)</h3>
        {data.topAgents.length === 0 ? (
          <EmptyState title="No cost data" description="Agent cost breakdown will appear here after calls start." icon={BarChart2} />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Agent</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Total cost</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Calls</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Cost/call</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topAgents.map(row => (
                  <tr key={row.agentName} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-swiss-charcoal">{row.agentName}</td>
                    <td className="px-4 py-2.5 text-right">{fmt.usd(row.costUsd)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.calls}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.calls > 0 ? fmt.usd(row.costUsd / row.calls) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Daily chart (text table as placeholder — real chart requires recharts or similar) */}
      {data.dailyChart.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily spend (last 30 days)</h3>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Total cost</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Agents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.dailyChart.slice().reverse().map(row => (
                    <tr key={row.date} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{row.date}</td>
                      <td className="px-4 py-2 text-right font-medium text-swiss-charcoal">{fmt.usd(row.totalCost)}</td>
                      <td className="px-4 py-2 text-gray-400 text-[10px]">
                        {Object.entries(row.byAgent).map(([a, c]) => `${a}: $${Number(c).toFixed(4)}`).join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Knowledge ───────────────────────────────────────────────────────────

const KnowledgeTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const { data, isLoading } = useQuery<KnowledgeDoc[]>({
    queryKey: ['ai-admin-knowledge'],
    queryFn: async () => (await apiClient.get('/ai/admin/knowledge')).data,
    enabled: !!apiClient,
    staleTime: 60000,
  })

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (!data?.length) return (
    <EmptyState
      title="No knowledge documents"
      description="Static knowledge (role taxonomy, canton rules, status glossary) will appear here once seeded. Add docs to api/src/ai/knowledge/ and run the embedding step."
      icon={BookOpen}
    />
  )

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Title</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Source</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Locale</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Canton</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Audience</th>
              <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Version</th>
              <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-swiss-charcoal">{doc.title}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700">{doc.source}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{doc.locale}</td>
                <td className="px-4 py-2.5 text-gray-500">{doc.cantonScope ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{doc.audience ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">v{doc.version}</td>
                <td className="px-4 py-2.5 text-right text-gray-400">{fmt.date(doc.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Tab: Safety ─────────────────────────────────────────────────────────────

const SafetyTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const { data, isLoading } = useQuery<SafetyData>({
    queryKey: ['ai-admin-safety'],
    queryFn: async () => (await apiClient.get('/ai/admin/safety')).data,
    enabled: !!apiClient,
    staleTime: 60000,
  })

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (!data) return <EmptyState title="No safety data" description="Consent grants and safety events appear here once educators start accepting the AI consent policy." icon={ShieldCheck} />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatTile icon={CheckCircle} label="Active consents" value={String(data.activeConsents)} sub="Educators in AI matching pool" />
        <StatTile icon={XCircle} label="Revoked consents" value={String(data.revokedConsents)} sub="Removed from matching pool" />
        <StatTile icon={AlertTriangle} label="Blocked calls" value="—" sub="Sensitive field / scope violations (coming)" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent consent revocations</h3>
        {data.recentRevocations.length === 0 ? (
          <EmptyState title="No revocations" description="Revocations appear here when educators withdraw AI consent." icon={ShieldCheck} />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">User ID</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Version</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Revoked at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentRevocations.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-gray-600 text-xs">{r.userId}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">v{r.version}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{r.revokedAt ? new Date(r.revokedAt).toLocaleString('en-CH') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

const SettingsTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const qc = useQueryClient()

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['ai-admin-overview'],
    queryFn: async () => (await apiClient.get('/ai/admin/overview')).data,
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: envCheck } = useQuery<EnvCheck>({
    queryKey: ['ai-admin-env'],
    queryFn: async () => (await apiClient.get('/ai/admin/env-check')).data,
    enabled: !!apiClient,
    staleTime: 120000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      apiClient.patch('/ai/admin/flag', { flagId, enabled }),
    onSuccess: (_, { enabled }) => {
      toast.success(`AI Foundation ${enabled ? 'enabled' : 'disabled'}`)
      qc.invalidateQueries({ queryKey: ['ai-admin-overview'] })
    },
    onError: () => toast.error('Failed to update flag'),
  })

  const handleToggle = () => {
    if (!overview?.foundation.flagId) return toast.error('Feature flag not seeded')
    if (!overview.foundation.enabled) {
      toggleMutation.mutate({ flagId: overview.foundation.flagId, enabled: true })
    } else {
      if (!window.confirm('Disable AI Foundation? This stops all AI calls platform-wide.')) return
      toggleMutation.mutate({ flagId: overview.foundation.flagId, enabled: false })
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Kill switch */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Master kill switch</h3>
        <p className="text-xs text-gray-500 mb-3">Toggles the <code className="bg-gray-100 px-1 rounded">ai_foundation_enabled</code> feature flag. When off, all calls to <code className="bg-gray-100 px-1 rounded">LlmClient.run()</code> throw immediately.</p>
        {overview ? (
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${overview.foundation.enabled ? 'text-green-700' : 'text-red-600'}`}>
              <StatusDot ok={overview.foundation.enabled} />
              AI Foundation is {overview.foundation.enabled ? 'ENABLED' : 'DISABLED'}
            </div>
            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              className={`text-sm px-4 py-2 rounded-md font-medium transition-colors ${overview.foundation.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            >
              {toggleMutation.isPending ? '…' : overview.foundation.enabled ? 'Disable AI Foundation' : 'Enable AI Foundation'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2"><LoadingSpinner /> <span className="text-sm text-gray-500">Loading…</span></div>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* Environment variables */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Environment variables</h3>
        <p className="text-xs text-gray-500 mb-3">Presence check only — values are never shown. Set these in your Render environment.</p>
        {envCheck ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(envCheck).map(([key, ok]) => (
              <EnvPill key={key} label={key} ok={ok as boolean} />
            ))}
          </div>
        ) : (
          <div className="flex gap-2"><LoadingSpinner /></div>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* Static config info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Static configuration</h3>
        <p className="text-xs text-gray-500 mb-3">
          Model chains, output ceilings, and agent allowlists are defined in{' '}
          <code className="bg-gray-100 px-1 rounded">api/src/ai/ai-agents.config.ts</code> and ship via PR.
          Runtime overrides (active prompt version, per-agent config) are managed in the Agents tab.
        </p>
        <div className="space-y-1 text-xs text-gray-500">
          <p>• Default primary model: <span className="font-mono bg-gray-100 px-1 rounded">google/gemini-2.5-flash</span></p>
          <p>• Default secondary: <span className="font-mono bg-gray-100 px-1 rounded">deepseek/deepseek-chat</span></p>
          <p>• Embeddings: <span className="font-mono bg-gray-100 px-1 rounded">voyage-3-lite</span> (direct, not via OpenRouter)</p>
          <p>• Audit log retention: 24 months (Swiss FADP aligned)</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AiOperationsPage: React.FC = () => {
  const apiClient = useApiClient()

  const tabs = [
    { label: 'Overview',     icon: Activity,     content: <OverviewTab apiClient={apiClient} /> },
    { label: 'Agents',       icon: Brain,        content: <AgentsTab apiClient={apiClient} /> },
    { label: 'Audit Log',    icon: FileSearch,   content: <AuditLogTab apiClient={apiClient} /> },
    { label: 'Cost',         icon: DollarSign,   content: <CostTab apiClient={apiClient} /> },
    { label: 'Knowledge',    icon: BookOpen,     content: <KnowledgeTab apiClient={apiClient} /> },
    { label: 'Safety',       icon: ShieldCheck,  content: <SafetyTab apiClient={apiClient} /> },
    { label: 'Settings',     icon: Settings,     content: <SettingsTab apiClient={apiClient} /> },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-swiss-teal/10">
          <Brain className="w-5 h-5 text-swiss-teal" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-swiss-charcoal">AI Operations</h1>
          <p className="text-sm text-gray-500">Shared AI Foundation — gateway, audit, cost, knowledge, safety</p>
        </div>
      </div>
      <Tabs tabs={tabs} variant="line" />
    </div>
  )
}

export default AiOperationsPage
