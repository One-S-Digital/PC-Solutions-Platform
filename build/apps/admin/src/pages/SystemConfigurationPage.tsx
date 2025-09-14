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

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  isEncrypted: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  provider: string;
  isActive: boolean;
  configuration: any;
  credentials: any;
  webhookUrl?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceMode {
  id: string;
  isEnabled: boolean;
  message: string;
  allowedPaths: string[];
  allowedRoles: string[];
  estimatedEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceSchedule {
  id: string;
  name: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  isActive: boolean;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastCheck: string;
  }>;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
    connections: number;
  };
  storage: {
    status: 'available' | 'unavailable';
    usedSpace: number;
    totalSpace: number;
  };
  lastChecked: string;
}

export default function SystemConfigurationPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'integrations' | 'maintenance' | 'health' | 'templates'>('settings');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode | null>(null);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSetting, setShowCreateSetting] = useState(false);
  const [showCreateIntegration, setShowCreateIntegration] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    isEncrypted: false,
    isPublic: false,
  });
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    type: 'other',
    provider: '',
    configuration: {},
    credentials: {},
    webhookUrl: '',
  });
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    description: '',
    scheduledStart: '',
    scheduledEnd: '',
  });

  const fetchSettings = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/integrations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }

      const data = await response.json();
      setIntegrations(data);
    } catch (err: any) {
      console.error('Failed to fetch integrations:', err);
    }
  };

  const fetchMaintenanceMode = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/maintenance', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance mode');
      }

      const data = await response.json();
      setMaintenanceMode(data);
    } catch (err: any) {
      console.error('Failed to fetch maintenance mode:', err);
    }
  };

  const fetchMaintenanceSchedules = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/maintenance/schedules', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance schedules');
      }

      const data = await response.json();
      setMaintenanceSchedules(data);
    } catch (err: any) {
      console.error('Failed to fetch maintenance schedules:', err);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/health', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const data = await response.json();
      setSystemHealth(data);
    } catch (err: any) {
      console.error('Failed to fetch system health:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSettings(),
        fetchIntegrations(),
        fetchMaintenanceMode(),
        fetchMaintenanceSchedules(),
        fetchSystemHealth(),
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleCreateSetting = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSetting),
      });

      if (!response.ok) {
        throw new Error('Failed to create system setting');
      }

      alert('System setting created successfully!');
      setNewSetting({
        key: '',
        value: '',
        description: '',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      });
      setShowCreateSetting(false);
      fetchSettings();
    } catch (err: any) {
      alert(`Failed to create setting: ${err.message}`);
    }
  };

  const handleCreateIntegration = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/integrations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newIntegration),
      });

      if (!response.ok) {
        throw new Error('Failed to create integration');
      }

      alert('Integration created successfully!');
      setNewIntegration({
        name: '',
        type: 'other',
        provider: '',
        configuration: {},
        credentials: {},
        webhookUrl: '',
      });
      setShowCreateIntegration(false);
      fetchIntegrations();
    } catch (err: any) {
      alert(`Failed to create integration: ${err.message}`);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/maintenance/schedules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        throw new Error('Failed to create maintenance schedule');
      }

      alert('Maintenance schedule created successfully!');
      setNewSchedule({
        name: '',
        description: '',
        scheduledStart: '',
        scheduledEnd: '',
      });
      setShowCreateSchedule(false);
      fetchMaintenanceSchedules();
    } catch (err: any) {
      alert(`Failed to create schedule: ${err.message}`);
    }
  };

  const handleEnableMaintenance = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/maintenance/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Scheduled maintenance in progress. We apologize for any inconvenience.',
          allowedPaths: ['/api/health', '/api/maintenance'],
          allowedRoles: ['SUPER_ADMIN'],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enable maintenance mode');
      }

      alert('Maintenance mode enabled successfully!');
      fetchMaintenanceMode();
    } catch (err: any) {
      alert(`Failed to enable maintenance mode: ${err.message}`);
    }
  };

  const handleDisableMaintenance = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/system-configuration/maintenance/disable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to disable maintenance mode');
      }

      alert('Maintenance mode disabled successfully!');
      fetchMaintenanceMode();
    } catch (err: any) {
      alert(`Failed to disable maintenance mode: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'low';
      case 'degraded': return 'medium';
      case 'critical': return 'critical';
      case 'up': return 'low';
      case 'down': return 'critical';
      case 'connected': return 'low';
      case 'disconnected': return 'critical';
      case 'available': return 'low';
      case 'unavailable': return 'critical';
      default: return 'low';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading system configuration...</p>
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
            <h1 className="text-admin-text font-semibold tracking-tight">System Configuration</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminButton 
              variant="outline" 
              size="sm"
              onClick={() => {
                fetchSettings();
                fetchIntegrations();
                fetchMaintenanceMode();
                fetchMaintenanceSchedules();
                fetchSystemHealth();
              }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AdminMetric
              label="System Status"
              value={systemHealth.status.toUpperCase()}
              change={{ value: 0, type: 'neutral' }}
              icon="🔧"
            />
            <AdminMetric
              label="Database Response"
              value={`${systemHealth.database.responseTime}ms`}
              change={{ value: 0, type: 'neutral' }}
              icon="🗄️"
            />
            <AdminMetric
              label="Active Services"
              value={`${systemHealth.services.filter(s => s.status === 'up').length}/${systemHealth.services.length}`}
              change={{ value: 0, type: 'neutral' }}
              icon="⚡"
            />
            <AdminMetric
              label="Storage Used"
              value={`${Math.round((systemHealth.storage.usedSpace / systemHealth.storage.totalSpace) * 100)}%`}
              change={{ value: 0, type: 'neutral' }}
              icon="💾"
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'settings', label: 'System Settings' },
              { id: 'integrations', label: 'Integrations' },
              { id: 'maintenance', label: 'Maintenance' },
              { id: 'health', label: 'System Health' },
              { id: 'templates', label: 'Email Templates' },
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

        {/* System Settings Tab */}
        {activeTab === 'settings' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">System Settings</h3>
              <AdminButton 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateSetting(true)}
              >
                Create Setting
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>Key</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Value</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Category</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Type</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {settings.map((setting) => (
                  <AdminTableRow key={setting.id}>
                    <AdminTableCell>
                      <div>
                        <div className="font-medium text-admin-text">{setting.key}</div>
                        <div className="text-sm text-admin-muted">{setting.description}</div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-sm text-admin-text">
                        {typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant="low">{setting.category}</AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-1">
                        {setting.isEncrypted && <AdminBadge variant="high">Encrypted</AdminBadge>}
                        {setting.isPublic && <AdminBadge variant="medium">Public</AdminBadge>}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          Edit
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          View
                        </AdminButton>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">Integrations</h3>
              <AdminButton 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateIntegration(true)}
              >
                Create Integration
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Type</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Provider</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Last Sync</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {integrations.map((integration) => (
                  <AdminTableRow key={integration.id}>
                    <AdminTableCell>
                      <div className="font-medium text-admin-text">{integration.name}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant="low">{integration.type}</AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-admin-text">{integration.provider}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={integration.isActive ? 'low' : 'medium'}>
                        {integration.isActive ? 'Active' : 'Inactive'}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-sm text-admin-text">
                        {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          Test
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          Sync
                        </AdminButton>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <AdminCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-admin-text">Maintenance Mode</h3>
                <div className="flex gap-2">
                  {maintenanceMode?.isEnabled ? (
                    <AdminButton 
                      variant="danger" 
                      size="sm"
                      onClick={handleDisableMaintenance}
                    >
                      Disable Maintenance
                    </AdminButton>
                  ) : (
                    <AdminButton 
                      variant="primary" 
                      size="sm"
                      onClick={handleEnableMaintenance}
                    >
                      Enable Maintenance
                    </AdminButton>
                  )}
                </div>
              </div>
              
              {maintenanceMode && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <AdminBadge variant={maintenanceMode.isEnabled ? 'critical' : 'low'}>
                      {maintenanceMode.isEnabled ? 'Enabled' : 'Disabled'}
                    </AdminBadge>
                    {maintenanceMode.estimatedEndTime && (
                      <span className="text-sm text-admin-text">
                        Estimated end: {new Date(maintenanceMode.estimatedEndTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-admin-text">{maintenanceMode.message}</div>
                </div>
              )}
            </AdminCard>

            <AdminCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-admin-text">Maintenance Schedules</h3>
                <AdminButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowCreateSchedule(true)}
                >
                  Create Schedule
                </AdminButton>
              </div>
              
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Description</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Scheduled Start</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Scheduled End</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {maintenanceSchedules.map((schedule) => (
                    <AdminTableRow key={schedule.id}>
                      <AdminTableCell>
                        <div className="font-medium text-admin-text">{schedule.name}</div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="text-sm text-admin-text">{schedule.description}</div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="text-sm text-admin-text">
                          {new Date(schedule.scheduledStart).toLocaleString()}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="text-sm text-admin-text">
                          {new Date(schedule.scheduledEnd).toLocaleString()}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={schedule.isActive ? 'low' : 'medium'}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex gap-2">
                          <AdminButton variant="outline" size="sm">
                            Edit
                          </AdminButton>
                          <AdminButton variant="secondary" size="sm">
                            View
                          </AdminButton>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </AdminCard>
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'health' && systemHealth && (
          <div className="space-y-6">
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">System Health Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-admin-text mb-2">Database</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-admin-text">Status</span>
                      <AdminBadge variant={getStatusColor(systemHealth.database.status)}>
                        {systemHealth.database.status}
                      </AdminBadge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text">Response Time</span>
                      <span className="text-admin-text">{systemHealth.database.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text">Connections</span>
                      <span className="text-admin-text">{systemHealth.database.connections}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-admin-text mb-2">Storage</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-admin-text">Status</span>
                      <AdminBadge variant={getStatusColor(systemHealth.storage.status)}>
                        {systemHealth.storage.status}
                      </AdminBadge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text">Used Space</span>
                      <span className="text-admin-text">
                        {Math.round((systemHealth.storage.usedSpace / systemHealth.storage.totalSpace) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">External Services</h3>
              <div className="space-y-3">
                {systemHealth.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <span className="font-medium text-admin-text">{service.name}</span>
                      {service.responseTime && (
                        <span className="text-sm text-admin-muted ml-2">({service.responseTime}ms)</span>
                      )}
                    </div>
                    <AdminBadge variant={getStatusColor(service.status)}>
                      {service.status}
                    </AdminBadge>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* Email Templates Tab */}
        {activeTab === 'templates' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">Email Templates</h3>
              <AdminButton variant="primary" size="sm">
                Create Template
              </AdminButton>
            </div>
            
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📧</div>
              <h4 className="text-lg font-medium text-admin-text mb-2">Email Templates</h4>
              <p className="text-admin-muted mb-4">Manage email templates for notifications</p>
              <AdminButton variant="primary">
                Go to Email Templates
              </AdminButton>
            </div>
          </AdminCard>
        )}

        {/* Create Setting Modal */}
        {showCreateSetting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Create System Setting</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Key</label>
                    <input
                      type="text"
                      className="admin-input w-full px-3 py-2"
                      value={newSetting.key}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Category</label>
                    <select
                      className="admin-input w-full px-3 py-2"
                      value={newSetting.category}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="general">General</option>
                      <option value="security">Security</option>
                      <option value="email">Email</option>
                      <option value="payment">Payment</option>
                      <option value="storage">Storage</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Value</label>
                  <textarea
                    className="admin-input w-full px-3 py-2"
                    rows={3}
                    value={newSetting.value}
                    onChange={(e) => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Description</label>
                  <textarea
                    className="admin-input w-full px-3 py-2"
                    rows={2}
                    value={newSetting.description}
                    onChange={(e) => setNewSetting(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={newSetting.isEncrypted}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, isEncrypted: e.target.checked }))}
                    />
                    Encrypted
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={newSetting.isPublic}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    Public
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <AdminButton variant="primary" onClick={handleCreateSetting}>
                  Create Setting
                </AdminButton>
                <AdminButton variant="outline" onClick={() => setShowCreateSetting(false)}>
                  Cancel
                </AdminButton>
              </div>
            </div>
          </div>
        )}

        {/* Create Integration Modal */}
        {showCreateIntegration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Create Integration</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Name</label>
                    <input
                      type="text"
                      className="admin-input w-full px-3 py-2"
                      value={newIntegration.name}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Type</label>
                    <select
                      className="admin-input w-full px-3 py-2"
                      value={newIntegration.type}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="auth">Authentication</option>
                      <option value="payment">Payment</option>
                      <option value="email">Email</option>
                      <option value="storage">Storage</option>
                      <option value="analytics">Analytics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Provider</label>
                  <input
                    type="text"
                    className="admin-input w-full px-3 py-2"
                    value={newIntegration.provider}
                    onChange={(e) => setNewIntegration(prev => ({ ...prev, provider: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Webhook URL (Optional)</label>
                  <input
                    type="url"
                    className="admin-input w-full px-3 py-2"
                    value={newIntegration.webhookUrl}
                    onChange={(e) => setNewIntegration(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <AdminButton variant="primary" onClick={handleCreateIntegration}>
                  Create Integration
                </AdminButton>
                <AdminButton variant="outline" onClick={() => setShowCreateIntegration(false)}>
                  Cancel
                </AdminButton>
              </div>
            </div>
          </div>
        )}

        {/* Create Schedule Modal */}
        {showCreateSchedule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Create Maintenance Schedule</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Name</label>
                  <input
                    type="text"
                    className="admin-input w-full px-3 py-2"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Description</label>
                  <textarea
                    className="admin-input w-full px-3 py-2"
                    rows={3}
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Scheduled Start</label>
                    <input
                      type="datetime-local"
                      className="admin-input w-full px-3 py-2"
                      value={newSchedule.scheduledStart}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, scheduledStart: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Scheduled End</label>
                    <input
                      type="datetime-local"
                      className="admin-input w-full px-3 py-2"
                      value={newSchedule.scheduledEnd}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, scheduledEnd: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <AdminButton variant="primary" onClick={handleCreateSchedule}>
                  Create Schedule
                </AdminButton>
                <AdminButton variant="outline" onClick={() => setShowCreateSchedule(false)}>
                  Cancel
                </AdminButton>
              </div>
            </div>
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