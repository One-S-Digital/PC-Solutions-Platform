import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Monitor, 
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Users,
  TrendingUp,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Trash2,
  Bell,
  BellOff,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  Info,
  Zap,
  Globe,
  Shield,
  Settings
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next';

const SystemMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'logs' | 'analytics' | 'security'>('overview')
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const queryClient = useQueryClient()
  const { t } = useTranslation(['common']);

  const { data: healthData, isLoading, error } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => publicApi.getSystemHealth(),
    refetchInterval: 300000, // Refresh every 5 minutes instead of 5 seconds
  })

  // System monitoring queries
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => publicApi.get('/api/system-monitoring/metrics'),
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: systemAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: () => publicApi.get('/api/system-monitoring/alerts'),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: errorLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => publicApi.get('/api/system-monitoring/logs'),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Additional analytics queries
  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: () => publicApi.get('/api/system-monitoring/performance'),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: userAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['user-analytics'],
    queryFn: () => publicApi.get('/api/system-monitoring/analytics'),
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: securityMetrics, isLoading: securityLoading } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: () => publicApi.get('/api/system-monitoring/security'),
    refetchInterval: 120000, // Refresh every 2 minutes
  })

  // Mutations
  const createAlertMutation = useMutation({
    mutationFn: (alertData: any) => publicApi.post('/api/system-monitoring/alerts', alertData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] })
      toast.success('Alert created successfully')
    },
    onError: () => {
      toast.error('Failed to create alert')
    }
  })

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => publicApi.delete(`/api/system-monitoring/alerts/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] })
      toast.success('Alert deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete alert')
    }
  })

  // Note: Real system metrics require backend monitoring infrastructure
  // These values will be populated when monitoring APIs are available
  // For now, we use health check data as the primary source of truth
  const realMetricsAvailable = !!systemMetrics?.data
  const realAlertsAvailable = !!systemAlerts?.data
  const realLogsAvailable = !!errorLogs?.data

  const systemStatus = healthData?.data?.status === 'OK'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center space-x-2">
      {status ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-red-500" />
      )}
      <span className={`text-sm ${status ? 'text-green-700' : 'text-red-700'}`}>
        {label}
      </span>
    </div>
  )

  const MetricCard = ({
    title,
    value,
    unit,
    icon: Icon,
    color = 'swiss-teal',
    percentage
  }: {
    title: string
    value: string | number
    unit?: string
    icon: LucideIcon
    color?: string
    percentage?: number
  }) => {
    const colorClasses: Record<string, { bg: string; text: string; bar: string }> = {
      'swiss-teal': {
        bg: 'bg-swiss-teal/10',
        text: 'text-swiss-teal',
        bar: 'bg-swiss-teal'
      },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', bar: 'bg-yellow-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-600' }
    }

    const { bg, text, bar } = colorClasses[color] || colorClasses['swiss-teal']

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${bg}`}>
            <Icon className={`h-6 w-6 ${text}`} />
          </div>
        </div>
        {percentage !== undefined && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${bar} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const filteredLogs = errorLogs?.data?.filter((log: any) => 
    logFilter === 'all' || log.level === logFilter
  ) || []

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['system-health'] })
    queryClient.invalidateQueries({ queryKey: ['system-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['system-alerts'] })
    queryClient.invalidateQueries({ queryKey: ['error-logs'] })
    toast.success('Data refreshed')
  }

  const handleCreateAlert = (alertData: any) => {
    createAlertMutation.mutate(alertData)
  }

  const handleDeleteAlert = (alertId: string) => {
    deleteAlertMutation.mutate(alertId)
  }

  const handleExportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Timestamp,Level,Message,Source\n" +
      filteredLogs.map((log: any) => 
        `${log.timestamp},${log.level},${log.message},${log.source}`
      ).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "system_logs.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Logs exported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Monitor className="h-8 w-8 mr-3 text-swiss-teal" />
            System Monitor
          </h1>
          <p className="mt-2 text-gray-600">
            Real-time system health and performance monitoring
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center space-x-2 px-4 py-2 bg-swiss-teal text-white rounded-lg hover:bg-swiss-teal/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{t('common:refresh')}</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'metrics', label: 'Metrics' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'logs', label: 'Error Logs' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'security', label: 'Security' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-swiss-teal text-swiss-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* System Status Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                systemStatus ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  systemStatus ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`} />
                <span className={`text-sm font-medium ${
                  systemStatus ? 'text-green-700' : 'text-red-700'
                }`}>
                  {systemStatus ? 'All Systems Operational' : 'System Issues Detected'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatusIndicator status={systemStatus} label="Backend API" />
              <StatusIndicator status={true} label="Database" />
              <StatusIndicator status={true} label="Authentication Service" />
            </div>

            {healthData?.data && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Environment:</span>
                  <span className="ml-2 font-medium">{healthData.data.environment}</span>
                </div>
                <div>
                  <span className="text-gray-500">Uptime:</span>
                  <span className="ml-2 font-medium">{Math.floor(healthData.data.uptime / 60)}m</span>
                </div>
                <div>
                  <span className="text-gray-500">Version:</span>
                  <span className="ml-2 font-medium">{healthData.data.version || '1.0.0'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Check:</span>
                  <span className="ml-2 font-medium">Just now</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title={t('common:titles.cpuusage')}
              value={realMetricsAvailable ? (systemMetrics?.data?.cpu ?? 'N/A') : 'N/A'}
              unit={realMetricsAvailable && systemMetrics?.data?.cpu ? '%' : ''}
              icon={Cpu}
              color="blue"
              percentage={realMetricsAvailable ? systemMetrics?.data?.cpu : undefined}
            />
            <MetricCard
              title={t('common:titles.memoryusage')}
              value={realMetricsAvailable ? (systemMetrics?.data?.memory ?? 'N/A') : 'N/A'}
              unit={realMetricsAvailable && systemMetrics?.data?.memory ? '%' : ''}
              icon={Activity}
              color="green"
              percentage={realMetricsAvailable ? systemMetrics?.data?.memory : undefined}
            />
            <MetricCard
              title={t('common:titles.activealerts')}
              value={realAlertsAvailable ? systemAlerts?.data?.filter((alert: any) => alert.status === 'active').length : 0}
              icon={AlertTriangle}
              color="red"
            />
            <MetricCard
              title={t('common:errors.errorrate')}
              value={realMetricsAvailable ? (systemMetrics?.data?.errorRate ?? 'N/A') : 'N/A'}
              unit={realMetricsAvailable && systemMetrics?.data?.errorRate !== undefined ? '%' : ''}
              icon={TrendingUp}
              color="yellow"
            />
          </div>
        </>
      )}

      {activeTab === 'metrics' && (
        <>
          {/* Server Metrics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Server Performance</h2>
            {!realMetricsAvailable && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  System metrics require backend monitoring infrastructure. Currently showing available health data.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title={t('common:titles.cpuusage')}
                value={realMetricsAvailable ? (systemMetrics?.data?.cpu ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.cpu ? '%' : ''}
                icon={Cpu}
                color="blue"
                percentage={realMetricsAvailable ? systemMetrics?.data?.cpu : undefined}
              />
              <MetricCard
                title={t('common:titles.memoryusage')}
                value={realMetricsAvailable ? (systemMetrics?.data?.memory ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.memory ? '%' : ''}
                icon={Activity}
                color="green"
                percentage={realMetricsAvailable ? systemMetrics?.data?.memory : undefined}
              />
              <MetricCard
                title={t('common:titles.diskusage')}
                value={realMetricsAvailable ? (systemMetrics?.data?.disk ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.disk ? '%' : ''}
                icon={HardDrive}
                color="yellow"
                percentage={realMetricsAvailable ? systemMetrics?.data?.disk : undefined}
              />
              <MetricCard
                title={t('common:titles.uptime')}
                value={healthData?.data?.uptime ? `${Math.floor(healthData.data.uptime / 3600)}h ${Math.floor((healthData.data.uptime % 3600) / 60)}m` : 'N/A'}
                icon={Clock}
                color="purple"
              />
            </div>
          </div>

          {/* Database Metrics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title={t('common:titles.activeconnections')}
                value={realMetricsAvailable && systemMetrics?.data?.dbConnections ? `${systemMetrics.data.dbConnections}/${systemMetrics.data.maxConnections || 100}` : 'N/A'}
                icon={Database}
                color="blue"
                percentage={realMetricsAvailable && systemMetrics?.data?.dbConnections ? (systemMetrics.data.dbConnections / (systemMetrics.data.maxConnections || 100)) * 100 : undefined}
              />
              <MetricCard
                title={t('common:titles.avgquerytime')}
                value={realMetricsAvailable ? (systemMetrics?.data?.queryTime ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.queryTime ? 'ms' : ''}
                icon={Activity}
                color="green"
              />
              <MetricCard
                title={t('common:titles.storageused')}
                value={realMetricsAvailable ? (systemMetrics?.data?.storage ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.storage ? '%' : ''}
                icon={HardDrive}
                color="yellow"
                percentage={realMetricsAvailable ? systemMetrics?.data?.storage : undefined}
              />
              <MetricCard
                title={t('common:titles.connectionhealth')}
                value={systemStatus ? 'Healthy' : 'Unknown'}
                icon={systemStatus ? CheckCircle : AlertCircle}
                color={systemStatus ? 'green' : 'yellow'}
              />
            </div>
          </div>

          {/* Application Metrics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title={t('common:titles.activeusers')}
                value={realMetricsAvailable ? (systemMetrics?.data?.activeUsers ?? 'N/A') : 'N/A'}
                icon={Users}
                color="blue"
              />
              <MetricCard
                title={t('common:titles.requestsmin')}
                value={realMetricsAvailable ? (systemMetrics?.data?.requestsPerMinute ?? 'N/A') : 'N/A'}
                icon={TrendingUp}
                color="green"
              />
              <MetricCard
                title={t('common:titles.responsetime')}
                value={realMetricsAvailable ? (systemMetrics?.data?.responseTime ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.responseTime ? 'ms' : ''}
                icon={Wifi}
                color="yellow"
              />
              <MetricCard
                title={t('common:errors.errorrate')}
                value={realMetricsAvailable ? (systemMetrics?.data?.errorRate ?? 'N/A') : 'N/A'}
                unit={realMetricsAvailable && systemMetrics?.data?.errorRate !== undefined ? '%' : ''}
                icon={AlertTriangle}
                color="red"
              />
            </div>
          </div>
        </>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Alerts Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
              <button
                onClick={() => handleCreateAlert({
                  type: 'performance',
                  severity: 'warning',
                  message: 'High CPU usage detected',
                  threshold: 80
                })}
                className="flex items-center space-x-2 px-4 py-2 bg-swiss-teal text-white rounded-lg hover:bg-swiss-teal/90 transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span>{t('common:createalert')}</span>
              </button>
            </div>

            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="space-y-4">
                {systemAlerts?.data?.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-500' :
                        alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{alert.message}</p>
                        <p className="text-sm text-gray-500">
                          {alert.type} • {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {alert.status}
                      </span>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Error Logs Console */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Error Logs Console</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">{t('common:alllogs')}</option>
                  <option value="error">{t('common:errors.errors')}</option>
                  <option value="warning">{t('common:warnings')}</option>
                  <option value="info">{t('common:info')}</option>
                </select>
                <button
                  onClick={handleExportLogs}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('common:export')}</span>
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="text-gray-500">No logs found</div>
                ) : (
                  filteredLogs.map((log: any, index: number) => (
                    <div key={index} className="mb-2">
                      <span className="text-gray-400">
                        [{new Date(log.timestamp).toLocaleString()}]
                      </span>
                      <span className={`ml-2 ${
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="ml-2">{log.message}</span>
                      {log.source && (
                        <span className="ml-2 text-gray-500">({log.source})</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Performance Analytics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-swiss-teal" />
                Performance Analytics
              </h2>
            </div>

            {!performanceMetrics?.data && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Performance analytics require backend monitoring infrastructure to be configured.
                </p>
              </div>
            )}

            {performanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title={t('common:titles.responsetime')}
                  value={performanceMetrics?.data?.avgResponseTime ?? 'N/A'}
                  unit={performanceMetrics?.data?.avgResponseTime ? 'ms' : ''}
                  icon={Zap}
                  color="blue"
                />
                <MetricCard
                  title={t('common:titles.throughput')}
                  value={performanceMetrics?.data?.requestsPerSecond ?? 'N/A'}
                  unit={performanceMetrics?.data?.requestsPerSecond ? 'req/s' : ''}
                  icon={TrendingUp}
                  color="green"
                />
                <MetricCard
                  title={t('common:errors.errorrate')}
                  value={performanceMetrics?.data?.errorRate ?? 'N/A'}
                  unit={performanceMetrics?.data?.errorRate !== undefined ? '%' : ''}
                  icon={AlertCircle}
                  color="red"
                />
                <MetricCard
                  title={t('common:titles.uptime')}
                  value={healthData?.data?.uptime ? `${Math.floor(healthData.data.uptime / 3600)}h ${Math.floor((healthData.data.uptime % 3600) / 60)}m` : 'N/A'}
                  icon={CheckCircle}
                  color="green"
                />
              </div>
            )}
          </div>

          {/* User Analytics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-swiss-teal" />
                User Analytics
              </h2>
            </div>

            {!userAnalytics?.data && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  User analytics require tracking infrastructure to be configured. See the main Dashboard for available user statistics.
                </p>
              </div>
            )}

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title={t('common:titles.activeusers')}
                  value={userAnalytics?.data?.activeUsers ?? 'N/A'}
                  icon={Users}
                  color="blue"
                />
                <MetricCard
                  title={t('common:titles.newuserstoday')}
                  value={userAnalytics?.data?.newUsersToday ?? 'N/A'}
                  icon={TrendingUp}
                  color="green"
                />
                <MetricCard
                  title={t('common:titles.sessionduration')}
                  value={userAnalytics?.data?.avgSessionDuration ?? 'N/A'}
                  unit={userAnalytics?.data?.avgSessionDuration ? 'min' : ''}
                  icon={Clock}
                  color="purple"
                />
                <MetricCard
                  title={t('common:titles.pageviews')}
                  value={userAnalytics?.data?.pageViews ?? 'N/A'}
                  icon={Eye}
                  color="yellow"
                />
              </div>
            )}
          </div>

          {/* Geographic Analytics Notice */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-swiss-teal" />
                Geographic Distribution
              </h2>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                Geographic analytics require user location tracking to be implemented.
                This feature will display user distribution by region once the tracking infrastructure is configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-swiss-teal" />
                Security Overview
              </h2>
            </div>

            {!securityMetrics?.data && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Security metrics require security monitoring infrastructure to be configured.
                </p>
              </div>
            )}

            {securityLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title={t('common:titles.failedlogins')}
                  value={securityMetrics?.data?.failedLogins ?? 'N/A'}
                  icon={AlertTriangle}
                  color="red"
                />
                <MetricCard
                  title={t('common:titles.blockedips')}
                  value={securityMetrics?.data?.blockedIPs ?? 'N/A'}
                  icon={Shield}
                  color="blue"
                />
                <MetricCard
                  title={t('common:titles.apihealth')}
                  value={systemStatus ? 'Healthy' : 'Unknown'}
                  icon={systemStatus ? CheckCircle : AlertCircle}
                  color={systemStatus ? 'green' : 'yellow'}
                />
                <MetricCard
                  title={t('common:titles.lastscan')}
                  value={securityMetrics?.data?.lastScan ?? 'N/A'}
                  icon={Settings}
                  color="purple"
                />
              </div>
            )}
          </div>

          {/* Security Events Notice */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Security Events</h2>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                Security event logging requires audit infrastructure to be configured.
                When enabled, this section will display recent security events such as failed logins, 
                suspicious activity, and security scans.
              </p>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-swiss-teal">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">IP Whitelist</h4>
                  <p className="text-sm text-gray-500">Restrict admin access to specific IPs</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Session Timeout</h4>
                  <p className="text-sm text-gray-500">Auto-logout after 30 minutes of inactivity</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-swiss-teal">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default SystemMonitor
