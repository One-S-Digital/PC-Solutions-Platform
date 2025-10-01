import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@repo/ui';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemHealth {
  overallStatus: string;
  services: ServiceHealth[];
  lastChecked: string;
}

interface ServiceHealth {
  id: string;
  serviceName: string;
  status: string;
  responseTime?: number;
  lastChecked: string;
  errorMessage?: string;
}

interface SystemAlert {
  id: string;
  alertType: string;
  title: string;
  message: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}

interface MonitoringDashboard {
  overallHealth: string;
  uptime: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  systemStats: SystemMetrics;
  recentAlerts: SystemAlert[];
  serviceStatus: ServiceHealth[];
}

const SystemMonitoringPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-monitoring/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboard(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Failed to load monitoring dashboard');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/system-monitoring/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolvedBy: 'admin' }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Alert resolved successfully');
        fetchDashboard();
      } else {
        throw new Error(data.message || 'Failed to resolve alert');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'error';
      default:
        return 'info';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'metrics', label: 'Metrics' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system health, performance, and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
              <p className="text-2xl font-bold capitalize">{dashboard?.overallHealth || 'Unknown'}</p>
            </div>
            {getStatusIcon(dashboard?.overallHealth || 'unknown')}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Uptime</p>
              <p className="text-2xl font-bold">{dashboard?.uptime?.toFixed(1) || 0}%</p>
            </div>
            <Server className="h-8 w-8 text-green-500" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${dashboard?.uptime || 0}%` }}
            ></div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-bold">{dashboard?.activeAlerts || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="error" className="text-xs">
              Critical: {dashboard?.criticalAlerts || 0}
            </Badge>
            <Badge variant="warning" className="text-xs">
              Warning: {dashboard?.warningAlerts || 0}
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Services</p>
              <p className="text-2xl font-bold">{dashboard?.serviceStatus?.length || 0}</p>
            </div>
            <Database className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {dashboard?.serviceStatus?.filter(s => s.status === 'healthy').length || 0} healthy
          </p>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-swiss-mint text-swiss-mint'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Stats */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                System Performance
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      <span className="text-sm">CPU Usage</span>
                    </div>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.cpuUsage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${dashboard?.systemStats?.cpuUsage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="text-sm">Memory Usage</span>
                    </div>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.memoryUsage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${dashboard?.systemStats?.memoryUsage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      <span className="text-sm">Disk Usage</span>
                    </div>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.diskUsage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${dashboard?.systemStats?.diskUsage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span className="text-sm">Network Latency</span>
                    </div>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.networkLatency?.toFixed(1) || 0}ms</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recent Alerts */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts
              </h2>
              <div className="space-y-3">
                {dashboard?.recentAlerts?.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm font-medium">{alert.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!alert.isResolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
                {(!dashboard?.recentAlerts || dashboard.recentAlerts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent alerts
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'services' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Status
            </h2>
            <div className="space-y-3">
              {dashboard?.serviceStatus?.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium">{service.serviceName}</p>
                      {service.responseTime && (
                        <p className="text-sm text-muted-foreground">
                          Response: {service.responseTime}ms
                        </p>
                      )}
                      {service.errorMessage && (
                        <p className="text-sm text-red-600">{service.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(service.lastChecked).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {(!dashboard?.serviceStatus || dashboard.serviceStatus.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No services found
                </p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'alerts' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </h2>
            <div className="space-y-3">
              {dashboard?.recentAlerts?.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-medium">{alert.title}</span>
                      {alert.isResolved && (
                        <Badge variant="success">Resolved</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!alert.isResolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
              {(!dashboard?.recentAlerts || dashboard.recentAlerts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No alerts found
                </p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.cpuUsage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${dashboard?.systemStats?.cpuUsage || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.memoryUsage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${dashboard?.systemStats?.memoryUsage || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Disk Usage</span>
                    <span className="text-sm font-medium">{dashboard?.systemStats?.diskUsage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${dashboard?.systemStats?.diskUsage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Network Metrics</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Network Latency</span>
                  <span className="text-sm font-medium">{dashboard?.systemStats?.networkLatency?.toFixed(1) || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Uptime</span>
                  <span className="text-sm font-medium">{dashboard?.uptime?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active Services</span>
                  <span className="text-sm font-medium">{dashboard?.serviceStatus?.length || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMonitoringPage;