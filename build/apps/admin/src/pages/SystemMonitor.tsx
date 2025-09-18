import React from 'react'
import { useQuery } from '@tanstack/react-query'
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
  TrendingUp
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { LucideIcon } from 'lucide-react'

const SystemMonitor: React.FC = () => {
  const { data: healthData, isLoading, error } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => publicApi.getSystemHealth(),
    refetchInterval: 300000, // Refresh every 5 minutes instead of 5 seconds
  })

  // Mock system metrics data
  const mockMetrics = {
    server: {
      cpu: 45,
      memory: 68,
      disk: 34,
      uptime: '5d 12h 23m',
      load: 0.75
    },
    database: {
      connections: 24,
      maxConnections: 100,
      queryTime: 12.5,
      storage: 78
    },
    application: {
      activeUsers: 156,
      requestsPerMinute: 342,
      responseTime: 89,
      errorRate: 0.2
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Monitor className="h-8 w-8 mr-3 text-swiss-teal" />
          System Monitor
        </h1>
        <p className="mt-2 text-gray-600">
          Real-time system health and performance monitoring
        </p>
      </div>

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

      {/* Server Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Server Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="CPU Usage"
            value={mockMetrics.server.cpu}
            unit="%"
            icon={Cpu}
            color="blue"
            percentage={mockMetrics.server.cpu}
          />
          <MetricCard
            title="Memory Usage"
            value={mockMetrics.server.memory}
            unit="%"
            icon={Activity}
            color="green"
            percentage={mockMetrics.server.memory}
          />
          <MetricCard
            title="Disk Usage"
            value={mockMetrics.server.disk}
            unit="%"
            icon={HardDrive}
            color="yellow"
            percentage={mockMetrics.server.disk}
          />
          <MetricCard
            title="Uptime"
            value={mockMetrics.server.uptime}
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
            title="Active Connections"
            value={`${mockMetrics.database.connections}/${mockMetrics.database.maxConnections}`}
            icon={Database}
            color="blue"
            percentage={(mockMetrics.database.connections / mockMetrics.database.maxConnections) * 100}
          />
          <MetricCard
            title="Avg Query Time"
            value={mockMetrics.database.queryTime}
            unit="ms"
            icon={Activity}
            color="green"
          />
          <MetricCard
            title="Storage Used"
            value={mockMetrics.database.storage}
            unit="%"
            icon={HardDrive}
            color="yellow"
            percentage={mockMetrics.database.storage}
          />
          <MetricCard
            title="Connection Health"
            value="Healthy"
            icon={CheckCircle}
            color="green"
          />
        </div>
      </div>

      {/* Application Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Users"
            value={mockMetrics.application.activeUsers}
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Requests/min"
            value={mockMetrics.application.requestsPerMinute}
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Response Time"
            value={mockMetrics.application.responseTime}
            unit="ms"
            icon={Wifi}
            color="yellow"
          />
          <MetricCard
            title="Error Rate"
            value={mockMetrics.application.errorRate}
            unit="%"
            icon={AlertTriangle}
            color="red"
          />
        </div>
      </div>

      {/* Recent System Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent System Events</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">System health check completed successfully</span>
            <span className="text-gray-400">• 30 seconds ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Database backup completed</span>
            <span className="text-gray-400">• 2 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">High memory usage detected (resolved)</span>
            <span className="text-gray-400">• 5 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">API endpoint response time improved</span>
            <span className="text-gray-400">• 10 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemMonitor
