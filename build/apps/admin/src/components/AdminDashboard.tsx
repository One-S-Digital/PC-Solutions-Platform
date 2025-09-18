import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
  AdminCard, 
  AdminButton, 
  AdminMetric, 
  AdminStatus, 
  AdminBadge,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell
} from '@repo/ui';
import { 
  UsersIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ServerIcon,
  DatabaseIcon,
  CpuChipIcon,
  WifiIcon,
  BellIcon,
  CreditCardIcon,
  WrenchScrewdriverIcon,
  EnvelopeIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import { useAdminDashboard } from '../services/adminService';

export function AdminDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  const {
    systemMetrics,
    userStats,
    systemAlerts,
    databaseStats,
    applicationStats,
    loading,
    error,
    resolveAlert,
    restartService,
    clearCache,
    runDiagnostics,
    refreshData
  } = useAdminDashboard();

  const handleResolveAlert = async (alertId: string) => {
    try {
      setIsPerformingAction(true);
      await resolveAlert(alertId);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleRestartService = async (serviceName: string) => {
    try {
      setIsPerformingAction(true);
      await restartService(serviceName);
      // Refresh data after restart
      setTimeout(refreshData, 2000);
    } catch (err) {
      console.error('Failed to restart service:', err);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setIsPerformingAction(true);
      await clearCache();
      // Refresh data after clearing cache
      setTimeout(refreshData, 1000);
    } catch (err) {
      console.error('Failed to clear cache:', err);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setIsPerformingAction(true);
      const results = await runDiagnostics();
      console.log('Diagnostics results:', results);
      // Refresh data after diagnostics
      setTimeout(refreshData, 2000);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen admin-page bg-admin-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-mint mx-auto mb-4"></div>
              <p className="text-admin-gray">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen admin-page bg-admin-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminCard className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Dashboard</h2>
              <p className="text-admin-gray mb-4">{error}</p>
              <AdminButton variant="primary" onClick={refreshData}>
                Retry
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-page bg-admin-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center mb-4">
              <div className="h-1 w-16 bg-admin-mint rounded-full mr-4"></div>
              <h1 className="text-3xl font-bold text-admin-charcoal font-swiss">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <AdminButton
                variant="outline"
                onClick={refreshData}
                disabled={isPerformingAction}
              >
                <ArrowUpIcon className="h-4 w-4 mr-2" />
                Refresh
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={handleRunDiagnostics}
                disabled={isPerformingAction}
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                {isPerformingAction ? 'Running...' : 'Diagnostics'}
              </AdminButton>
            </div>
          </div>
          <p className="text-admin-gray font-medium">
            Monitor system performance and manage platform operations
          </p>
        </div>

        {/* System Status Overview */}
        <div className="mb-8">
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-6 w-6 text-green-500 mr-3" />
                <h2 className="text-xl font-semibold text-admin-charcoal">System Status</h2>
              </div>
              <AdminStatus status="active">All Systems Operational</AdminStatus>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ServerIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-admin-charcoal">Application</h3>
                <p className="text-sm text-green-600">Running</p>
                <p className="text-xs text-admin-gray">v{applicationStats?.version}</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <DatabaseIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-admin-charcoal">Database</h3>
                <p className="text-sm text-green-600">Connected</p>
                <p className="text-xs text-admin-gray">{databaseStats?.connections}/{databaseStats?.maxConnections} connections</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <WifiIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-admin-charcoal">Network</h3>
                <p className="text-sm text-green-600">Active</p>
                <p className="text-xs text-admin-gray">{formatBytes(systemMetrics?.network.bytesIn || 0)}/s in</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UsersIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-admin-charcoal">Users</h3>
                <p className="text-sm text-green-600">{userStats?.activeUsers} Active</p>
                <p className="text-xs text-admin-gray">{userStats?.totalUsers} Total</p>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminMetric
            title="Total Users"
            value={userStats?.totalUsers?.toString() || '0'}
            change={`+${userStats?.newUsersToday || 0} today`}
            changeType="positive"
            icon={UsersIcon}
          />
          <AdminMetric
            title="Active Users"
            value={userStats?.activeUsers?.toString() || '0'}
            change={`${Math.round(((userStats?.activeUsers || 0) / (userStats?.totalUsers || 1)) * 100)}% of total`}
            changeType="positive"
            icon={EyeIcon}
          />
          <AdminMetric
            title="CPU Usage"
            value={`${Math.round(systemMetrics?.cpu.usage || 0)}%`}
            change={`${systemMetrics?.cpu.cores || 0} cores`}
            changeType={systemMetrics && systemMetrics.cpu.usage > 80 ? "negative" : "positive"}
            icon={CpuChipIcon}
          />
          <AdminMetric
            title="Memory Usage"
            value={`${Math.round(systemMetrics?.memory.usage || 0)}%`}
            change={`${formatBytes(systemMetrics?.memory.used || 0)} / ${formatBytes(systemMetrics?.memory.total || 0)}`}
            changeType={systemMetrics && systemMetrics.memory.usage > 80 ? "negative" : "positive"}
            icon={DatabaseIcon}
          />
        </div>

        {/* System Alerts */}
        <div className="mb-8">
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <BellIcon className="h-6 w-6 text-admin-mint mr-3" />
                <h2 className="text-xl font-semibold text-admin-charcoal">System Alerts</h2>
              </div>
              <AdminButton variant="outline" size="sm">
                View All Alerts
              </AdminButton>
            </div>

            <div className="space-y-4">
              {systemAlerts?.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`border-l-4 p-4 rounded-card ${
                  alert.type === 'error' ? 'border-red-500 bg-red-50' :
                  alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        alert.type === 'error' ? 'bg-red-500' :
                        alert.type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-admin-charcoal">{alert.title}</p>
                        <p className="text-xs text-admin-gray">{alert.message}</p>
                        <p className="text-xs text-admin-gray">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AdminBadge variant={alert.resolved ? "mint" : "coral"}>
                        {alert.resolved ? 'Resolved' : 'Active'}
                      </AdminBadge>
                      {!alert.resolved && (
                        <AdminButton 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={isPerformingAction}
                        >
                          Resolve
                        </AdminButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard className="p-6">
            <div className="flex items-center mb-6">
              <ChartBarIcon className="h-6 w-6 text-admin-mint mr-3" />
              <h2 className="text-xl font-semibold text-admin-charcoal">CPU Usage (24h)</h2>
            </div>
            <div className="h-64 flex items-end justify-between space-x-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div 
                    className="bg-admin-mint rounded-t-sm w-full mb-2 transition-all duration-300 hover:bg-admin-mint-dark"
                    style={{ height: `${Math.random() * 100 + 20}px` }}
                  ></div>
                  <span className="text-xs text-admin-gray">{i}:00</span>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <div className="flex items-center mb-6">
              <DatabaseIcon className="h-6 w-6 text-admin-mint mr-3" />
              <h2 className="text-xl font-semibold text-admin-charcoal">Memory Usage (24h)</h2>
            </div>
            <div className="h-64 flex items-end justify-between space-x-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div 
                    className="bg-admin-coral rounded-t-sm w-full mb-2 transition-all duration-300 hover:bg-admin-coral-dark"
                    style={{ height: `${Math.random() * 80 + 30}px` }}
                  ></div>
                  <span className="text-xs text-admin-gray">{i}:00</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-charcoal mb-4">Users by Role</h3>
            <div className="space-y-3">
              {userStats?.usersByRole && Object.entries(userStats.usersByRole).map(([role, count]) => (
                <div key={role}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-admin-gray">{role.replace('_', ' ')}</span>
                    <span className="text-sm font-medium text-admin-charcoal">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-admin-mint h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / (userStats.totalUsers || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-charcoal mb-4">Application Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-admin-gray">Requests per minute</span>
                <span className="text-sm font-medium text-admin-charcoal">{applicationStats?.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-admin-gray">Average response time</span>
                <span className="text-sm font-medium text-admin-charcoal">{applicationStats?.averageResponseTime}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-admin-gray">Error rate</span>
                <span className="text-sm font-medium text-admin-charcoal">{(applicationStats?.errorRate || 0) * 100}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-admin-gray">Uptime</span>
                <span className="text-sm font-medium text-admin-charcoal">{formatUptime(applicationStats?.uptime || 0)}</span>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-charcoal mb-4">System Actions</h3>
            <div className="space-y-3">
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleRestartService('application')}
                disabled={isPerformingAction}
              >
                <RocketLaunchIcon className="h-4 w-4 mr-2" />
                Restart Application
              </AdminButton>
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleClearCache}
                disabled={isPerformingAction}
              >
                <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                Clear Cache
              </AdminButton>
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleRestartService('database')}
                disabled={isPerformingAction}
              >
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Restart Database
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-charcoal mb-4">User Management</h3>
            <div className="space-y-3">
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/users')}
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Manage Users
              </AdminButton>
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/analytics')}
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Analytics
              </AdminButton>
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/moderation')}
              >
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Content Moderation
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-charcoal mb-4">System Monitoring</h3>
            <div className="space-y-3">
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/monitoring')}
              >
                <ServerIcon className="h-4 w-4 mr-2" />
                System Monitoring
              </AdminButton>
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/subscriptions')}
              >
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Subscription Management
              </AdminButton>
              <AdminButton 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/system-configuration')}
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                System Configuration
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}