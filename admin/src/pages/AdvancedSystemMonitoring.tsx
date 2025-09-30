import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'

interface SystemMetric {
  name: string
  value: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
  threshold: {
    warning: number
    critical: number
  }
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  source: string
  details?: string
}

const AdvancedSystemMonitoring: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h')
  const [logLevel, setLogLevel] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // System metrics query
  const { data: systemMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['system-metrics', selectedTimeRange],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return [
        {
          name: 'CPU Usage',
          value: 45,
          unit: '%',
          status: 'healthy' as const,
          trend: 'stable' as const,
          threshold: { warning: 70, critical: 90 }
        },
        {
          name: 'Memory Usage',
          value: 68,
          unit: '%',
          status: 'warning' as const,
          trend: 'up' as const,
          threshold: { warning: 70, critical: 90 }
        },
        {
          name: 'Disk Usage',
          value: 82,
          unit: '%',
          status: 'critical' as const,
          trend: 'up' as const,
          threshold: { warning: 80, critical: 95 }
        },
        {
          name: 'Network Latency',
          value: 12,
          unit: 'ms',
          status: 'healthy' as const,
          trend: 'down' as const,
          threshold: { warning: 50, critical: 100 }
        },
        {
          name: 'Database Connections',
          value: 23,
          unit: 'connections',
          status: 'healthy' as const,
          trend: 'stable' as const,
          threshold: { warning: 80, critical: 100 }
        },
        {
          name: 'Active Users',
          value: 156,
          unit: 'users',
          status: 'healthy' as const,
          trend: 'up' as const,
          threshold: { warning: 500, critical: 1000 }
        }
      ] as SystemMetric[]
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
  })

  // System logs query
  const { data: systemLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['system-logs', logLevel],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800))
      return [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info' as const,
          message: 'User authentication successful',
          source: 'auth-service',
          details: 'User ID: 12345, IP: 192.168.1.100'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'warning' as const,
          message: 'High memory usage detected',
          source: 'system-monitor',
          details: 'Memory usage: 85%, threshold: 80%'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'error' as const,
          message: 'Database connection timeout',
          source: 'database-service',
          details: 'Connection pool exhausted, retrying...'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          level: 'info' as const,
          message: 'Scheduled backup completed',
          source: 'backup-service',
          details: 'Backup size: 2.3GB, duration: 15 minutes'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          level: 'critical' as const,
          message: 'API rate limit exceeded',
          source: 'api-gateway',
          details: 'Rate limit: 1000 requests/minute, current: 1200'
        }
      ] as LogEntry[]
    },
    refetchInterval: autoRefresh ? 10000 : false, // 10 seconds
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'stable':
        return <Activity className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'critical':
        return 'bg-red-200 text-red-900'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredLogs = systemLogs?.filter(log => 
    logLevel === 'all' || log.level === logLevel
  ) || []

  const criticalMetrics = systemMetrics?.filter(metric => 
    metric.status === 'critical' || metric.status === 'warning'
  ) || []

  if (metricsLoading || logsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">System Monitoring</h1>
          <p className="mt-1 text-gray-500">Real-time system performance and health monitoring</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              refetchMetrics()
              refetchLogs()
            }}
          >
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "primary" : "secondary"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalMetrics.length > 0 && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-red-900">Critical Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalMetrics.map((metric) => (
              <div key={metric.name} className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                  {getStatusIcon(metric.status)}
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-red-600">
                    {metric.value}{metric.unit}
                  </span>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metric.trend)}
                    <span className="text-xs text-gray-500">
                      {metric.trend === 'up' ? 'Increasing' : 
                       metric.trend === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* System Metrics */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">System Metrics</h2>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systemMetrics?.map((metric) => (
            <div key={metric.name} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                {getStatusIcon(metric.status)}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">
                  {metric.value}{metric.unit}
                </span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metric.status === 'critical' ? 'bg-red-500' :
                      metric.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0{metric.unit}</span>
                  <span>{metric.threshold.warning}{metric.unit} warning</span>
                  <span>{metric.threshold.critical}{metric.unit} critical</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* System Logs */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">System Logs</h2>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div key={log.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">{log.source}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">{log.message}</p>
                  {log.details && (
                    <p className="text-xs text-gray-600">{log.details}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Server className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">API Server</p>
              <p className="text-xs text-green-600">Operational</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-green-600">Connected</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <HardDrive className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Storage</p>
              <p className="text-xs text-yellow-600">High Usage</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Network</p>
              <p className="text-xs text-green-600">Stable</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AdvancedSystemMonitoring