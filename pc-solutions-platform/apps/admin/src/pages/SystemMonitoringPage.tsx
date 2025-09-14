import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  AdminCard, 
  AdminButton, 
  AdminMetric, 
  AdminBadge,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from '@repo/ui';

interface HostMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  loadAverage: number[];
  uptime: number;
  timestamp: string;
}

interface ApplicationMetrics {
  apiRequests: number;
  apiLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  activeConnections: number;
  responseTime: number;
  throughput: number;
  timestamp: string;
}

interface DatabaseMetrics {
  connectionCount: number;
  slowQueries: number;
  storageUsed: number;
  storageTotal: number;
  queryTime: {
    avg: number;
    max: number;
  };
  indexHitRate: number;
  timestamp: string;
}

interface SystemAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  service: string;
  timestamp: string;
  metadata?: any;
}

interface SystemHealth {
  status: string;
  score: number;
  components: Array<{
    name: string;
    status: string;
    message: string;
  }>;
}

export default function SystemMonitoringPage() {
  const { getToken } = useAuth();
  const [hostMetrics, setHostMetrics] = useState<HostMetrics | null>(null);
  const [appMetrics, setAppMetrics] = useState<ApplicationMetrics | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'logs'>('overview');
  const [logFilters, setLogFilters] = useState({
    level: '',
    service: '',
    limit: '100',
  });

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const [hostRes, appRes, dbRes, healthRes, alertsRes] = await Promise.all([
        fetch('/api/admin/monitoring/host-metrics', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/monitoring/application-metrics', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/monitoring/database-metrics', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/monitoring/health', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/monitoring/alerts', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!hostRes.ok || !appRes.ok || !dbRes.ok || !healthRes.ok || !alertsRes.ok) {
        throw new Error('Failed to fetch system data');
      }

      const [hostData, appData, dbData, healthData, alertsData] = await Promise.all([
        hostRes.json(),
        appRes.json(),
        dbRes.json(),
        healthRes.json(),
        alertsRes.json(),
      ]);

      setHostMetrics(hostData);
      setAppMetrics(appData);
      setDbMetrics(dbData);
      setSystemHealth(healthData);
      setAlerts(alertsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = await getToken();
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(logFilters).filter(([_, value]) => value !== '')
        )
      );

      const response = await fetch(`/api/admin/monitoring/logs?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }

      alert('Alert resolved successfully');
      fetchSystemData();
    } catch (err: any) {
      alert(`Failed to resolve alert: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, logFilters]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'low';
      case 'WARNING': return 'medium';
      case 'CRITICAL': return 'critical';
      default: return 'low';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'LOW': return 'low';
      default: return 'low';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'FATAL': return 'critical';
      case 'ERROR': return 'high';
      case 'WARN': return 'medium';
      case 'INFO': return 'low';
      case 'DEBUG': return 'low';
      default: return 'low';
    }
  };

  if (loading && !hostMetrics) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading system monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <div className="admin-header sticky top-0 z-40 backdrop-blur bg-admin-surface/80 border-b border-admin-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 rounded-full bg-admin-accent"></div>
            <h1 className="text-admin-text font-semibold tracking-tight">System Monitoring</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminButton 
              variant="primary" 
              size="sm"
              onClick={fetchSystemData}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* System Health Overview */}
        {systemHealth && (
          <div className="mb-8">
            <AdminCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-admin-text">System Health</h2>
                <div className="flex items-center gap-3">
                  <AdminBadge variant={getHealthColor(systemHealth.status)}>
                    {systemHealth.status}
                  </AdminBadge>
                  <span className="text-2xl font-bold text-admin-text">
                    {systemHealth.score}/100
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {systemHealth.components.map((component) => (
                  <div key={component.name} className="text-center">
                    <AdminBadge variant={getHealthColor(component.status)}>
                      {component.status}
                    </AdminBadge>
                    <p className="text-sm text-admin-text mt-1">{component.name}</p>
                    <p className="text-xs text-admin-muted">{component.message}</p>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'metrics', label: 'Metrics' },
              { id: 'alerts', label: 'Alerts' },
              { id: 'logs', label: 'Logs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-muted hover:text-admin-text hover:border-admin-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminMetric
              label="CPU Usage"
              value={`${hostMetrics?.cpuUsage.toFixed(1)}%`}
              change={{ value: 5, type: 'increase' }}
              icon="⚡"
            />
            <AdminMetric
              label="Memory Usage"
              value={`${hostMetrics?.memoryUsage.toFixed(1)}%`}
              change={{ value: 3, type: 'increase' }}
              icon="💾"
            />
            <AdminMetric
              label="API Requests"
              value={appMetrics?.apiRequests.toLocaleString() || '0'}
              change={{ value: 12, type: 'increase' }}
              icon="📡"
            />
            <AdminMetric
              label="Error Rate"
              value={`${appMetrics?.errorRate.toFixed(2)}%`}
              change={{ value: 2, type: 'decrease' }}
              icon="📊"
            />
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Host Metrics */}
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Host Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">CPU Usage</label>
                  <p className="text-2xl font-bold text-admin-text">{hostMetrics?.cpuUsage.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Memory Usage</label>
                  <p className="text-2xl font-bold text-admin-text">{hostMetrics?.memoryUsage.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Disk Usage</label>
                  <p className="text-2xl font-bold text-admin-text">{hostMetrics?.diskUsage.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Load Average</label>
                  <p className="text-sm text-admin-text">
                    {hostMetrics?.loadAverage.map(load => load.toFixed(2)).join(', ')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Uptime</label>
                  <p className="text-sm text-admin-text">
                    {hostMetrics ? Math.floor(hostMetrics.uptime / 3600000) : 0} hours
                  </p>
                </div>
              </div>
            </AdminCard>

            {/* Application Metrics */}
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Application Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">API Requests</label>
                  <p className="text-2xl font-bold text-admin-text">{appMetrics?.apiRequests.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Response Time (p95)</label>
                  <p className="text-2xl font-bold text-admin-text">{appMetrics?.apiLatency.p95.toFixed(0)}ms</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Active Connections</label>
                  <p className="text-2xl font-bold text-admin-text">{appMetrics?.activeConnections.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Error Rate</label>
                  <p className="text-2xl font-bold text-admin-text">{appMetrics?.errorRate.toFixed(2)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Throughput</label>
                  <p className="text-2xl font-bold text-admin-text">{appMetrics?.throughput.toFixed(0)} req/s</p>
                </div>
              </div>
            </AdminCard>

            {/* Database Metrics */}
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Database Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Connections</label>
                  <p className="text-2xl font-bold text-admin-text">{dbMetrics?.connectionCount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Slow Queries</label>
                  <p className="text-2xl font-bold text-admin-text">{dbMetrics?.slowQueries}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Storage Used</label>
                  <p className="text-2xl font-bold text-admin-text">{dbMetrics?.storageUsed.toFixed(1)} GB</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Index Hit Rate</label>
                  <p className="text-2xl font-bold text-admin-text">{dbMetrics?.indexHitRate.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Avg Query Time</label>
                  <p className="text-2xl font-bold text-admin-text">{dbMetrics?.queryTime.avg.toFixed(0)}ms</p>
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">System Alerts</h3>
              <AdminButton 
                variant="outline" 
                size="sm"
                onClick={fetchSystemData}
              >
                Refresh
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>Type</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Severity</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Message</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Value</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Threshold</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Timestamp</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {alerts.map((alert) => (
                  <AdminTableRow key={alert.id}>
                    <AdminTableCell>{alert.type}</AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>{alert.message}</AdminTableCell>
                    <AdminTableCell>{alert.value.toFixed(2)}</AdminTableCell>
                    <AdminTableCell>{alert.threshold}</AdminTableCell>
                    <AdminTableCell>
                      {new Date(alert.timestamp).toLocaleString()}
                    </AdminTableCell>
                    <AdminTableCell>
                      {!alert.resolved && (
                        <AdminButton 
                          variant="outline" 
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </AdminButton>
                      )}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Log Filters */}
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Log Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Level</label>
                  <select 
                    className="admin-input w-full px-3 py-2"
                    value={logFilters.level}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, level: e.target.value }))}
                  >
                    <option value="">All Levels</option>
                    <option value="DEBUG">Debug</option>
                    <option value="INFO">Info</option>
                    <option value="WARN">Warning</option>
                    <option value="ERROR">Error</option>
                    <option value="FATAL">Fatal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Service</label>
                  <select 
                    className="admin-input w-full px-3 py-2"
                    value={logFilters.service}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, service: e.target.value }))}
                  >
                    <option value="">All Services</option>
                    <option value="api">API</option>
                    <option value="auth">Auth</option>
                    <option value="database">Database</option>
                    <option value="upload">Upload</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Limit</label>
                  <select 
                    className="admin-input w-full px-3 py-2"
                    value={logFilters.limit}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, limit: e.target.value }))}
                  >
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                  </select>
                </div>
              </div>
            </AdminCard>

            {/* Logs Table */}
            <AdminCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-admin-text">System Logs</h3>
                <AdminButton 
                  variant="outline" 
                  size="sm"
                  onClick={fetchLogs}
                >
                  Refresh
                </AdminButton>
              </div>
              
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableHeaderCell>Level</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Service</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Message</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Timestamp</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Metadata</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {logs.map((log) => (
                    <AdminTableRow key={log.id}>
                      <AdminTableCell>
                        <AdminBadge variant={getLogLevelColor(log.level)}>
                          {log.level}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>{log.service}</AdminTableCell>
                      <AdminTableCell>{log.message}</AdminTableCell>
                      <AdminTableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </AdminTableCell>
                      <AdminTableCell>
                        {log.metadata ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-admin-accent">View</summary>
                            <pre className="mt-2 text-xs text-admin-muted">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : '-'}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </AdminCard>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </main>
    </div>
  );
}