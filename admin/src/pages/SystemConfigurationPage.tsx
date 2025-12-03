import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['admin', 'common']);
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

      alert(t('admin:settings.systemConfig.systemSettings.alerts.created'));
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
      alert(t('admin:settings.systemConfig.systemSettings.alerts.createFailed', { message: err.message }));
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

      alert(t('admin:settings.systemConfig.integrations.alerts.created'));
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
      alert(t('admin:settings.systemConfig.integrations.alerts.createFailed', { message: err.message }));
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

      alert(t('admin:settings.systemConfig.maintenance.alerts.scheduleCreated'));
      setNewSchedule({
        name: '',
        description: '',
        scheduledStart: '',
        scheduledEnd: '',
      });
      setShowCreateSchedule(false);
      fetchMaintenanceSchedules();
    } catch (err: any) {
      alert(t('admin:settings.systemConfig.maintenance.alerts.scheduleFailed', { message: err.message }));
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

      alert(t('admin:settings.systemConfig.maintenance.alerts.enabled'));
      fetchMaintenanceMode();
    } catch (err: any) {
      alert(t('admin:settings.systemConfig.maintenance.alerts.enableFailed', { message: err.message }));
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

      alert(t('admin:settings.systemConfig.maintenance.alerts.disabled'));
      fetchMaintenanceMode();
    } catch (err: any) {
      alert(t('admin:settings.systemConfig.maintenance.alerts.disableFailed', { message: err.message }));
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
          <p className="text-admin-muted">{t('admin:settings.systemConfig.loading')}</p>
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
            <h1 className="text-admin-text font-semibold tracking-tight">{t('admin:settings.systemConfig.title')}</h1>
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
              {t('admin:settings.systemConfig.refresh')}
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
              label={t('admin:settings.systemConfig.systemHealth.labels.systemStatus')}
              value={systemHealth.status.toUpperCase()}
              change={{ value: 0, type: 'neutral' }}
              icon="🔧"
            />
            <AdminMetric
              label={t('admin:settings.systemConfig.systemHealth.labels.databaseResponse')}
              value={`${systemHealth.database.responseTime}ms`}
              change={{ value: 0, type: 'neutral' }}
              icon="🗄️"
            />
            <AdminMetric
              label={t('admin:settings.systemConfig.systemHealth.labels.activeServices')}
              value={`${systemHealth.services.filter(s => s.status === 'up').length}/${systemHealth.services.length}`}
              change={{ value: 0, type: 'neutral' }}
              icon="⚡"
            />
            <AdminMetric
              label={t('admin:settings.systemConfig.systemHealth.labels.storageUsed')}
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
              { id: 'settings', label: t('admin:settings.systemConfig.tabs.systemSettings') },
              { id: 'integrations', label: t('admin:settings.systemConfig.tabs.integrations') },
              { id: 'maintenance', label: t('admin:settings.systemConfig.tabs.maintenance') },
              { id: 'health', label: t('admin:settings.systemConfig.tabs.systemHealth') },
              { id: 'templates', label: t('admin:settings.systemConfig.tabs.emailTemplates') },
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
              <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.systemConfig.systemSettings.title')}</h3>
              <AdminButton 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateSetting(true)}
              >
                {t('admin:settings.systemConfig.systemSettings.createSetting')}
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.systemSettings.tableHeaders.key')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.systemSettings.tableHeaders.value')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.systemSettings.tableHeaders.category')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.systemSettings.tableHeaders.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.systemSettings.tableHeaders.actions')}</AdminTableHeaderCell>
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
                        {setting.isEncrypted && <AdminBadge variant="high">{t('admin:settings.systemConfig.systemSettings.badges.encrypted')}</AdminBadge>}
                        {setting.isPublic && <AdminBadge variant="medium">{t('admin:settings.systemConfig.systemSettings.badges.public')}</AdminBadge>}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          {t('admin:settings.systemConfig.systemSettings.buttons.edit')}
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          {t('admin:settings.systemConfig.systemSettings.buttons.view')}
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
              <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.systemConfig.integrations.title')}</h3>
              <AdminButton 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateIntegration(true)}
              >
                {t('admin:settings.systemConfig.integrations.createIntegration')}
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.integrations.tableHeaders.name')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.integrations.tableHeaders.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.integrations.tableHeaders.provider')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.integrations.tableHeaders.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.integrations.tableHeaders.lastSync')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('admin:settings.systemConfig.integrations.tableHeaders.actions')}</AdminTableHeaderCell>
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
                        {integration.isActive ? t('admin:settings.systemConfig.integrations.status.active') : t('admin:settings.systemConfig.integrations.status.inactive')}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-sm text-admin-text">
                        {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : t('admin:settings.systemConfig.integrations.status.never')}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          {t('admin:settings.systemConfig.integrations.buttons.test')}
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          {t('admin:settings.systemConfig.integrations.buttons.sync')}
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
                <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.systemConfig.maintenance.title')}</h3>
                <div className="flex gap-2">
                  {maintenanceMode?.isEnabled ? (
                    <AdminButton 
                      variant="danger" 
                      size="sm"
                      onClick={handleDisableMaintenance}
                    >
                      {t('admin:settings.systemConfig.maintenance.buttons.disable')}
                    </AdminButton>
                  ) : (
                    <AdminButton 
                      variant="primary" 
                      size="sm"
                      onClick={handleEnableMaintenance}
                    >
                      {t('admin:settings.systemConfig.maintenance.buttons.enable')}
                    </AdminButton>
                  )}
                </div>
              </div>
              
              {maintenanceMode && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <AdminBadge variant={maintenanceMode.isEnabled ? 'critical' : 'low'}>
                      {maintenanceMode.isEnabled ? t('admin:settings.systemConfig.maintenance.status.enabled') : t('admin:settings.systemConfig.maintenance.status.disabled')}
                    </AdminBadge>
                    {maintenanceMode.estimatedEndTime && (
                      <span className="text-sm text-admin-text">
                        {t('admin:settings.systemConfig.maintenance.estimatedEnd', { date: new Date(maintenanceMode.estimatedEndTime).toLocaleString() })}
                      </span>
                    )}
                  </div>
                  <div className="text-admin-text">{maintenanceMode.message}</div>
                </div>
              )}
            </AdminCard>

            <AdminCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.systemConfig.maintenance.schedules.title')}</h3>
                <AdminButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowCreateSchedule(true)}
                >
                  {t('admin:settings.systemConfig.maintenance.schedules.createSchedule')}
                </AdminButton>
              </div>
              
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('admin:settings.systemConfig.maintenance.tableHeaders.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.systemConfig.maintenance.tableHeaders.description')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.systemConfig.maintenance.tableHeaders.scheduledStart')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.systemConfig.maintenance.tableHeaders.scheduledEnd')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.systemConfig.maintenance.tableHeaders.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.systemConfig.maintenance.tableHeaders.actions')}</AdminTableHeaderCell>
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
                          {schedule.isActive ? t('admin:settings.systemConfig.integrations.status.active') : t('admin:settings.systemConfig.integrations.status.inactive')}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex gap-2">
                          <AdminButton variant="outline" size="sm">
                            {t('admin:settings.systemConfig.systemSettings.buttons.edit')}
                          </AdminButton>
                          <AdminButton variant="secondary" size="sm">
                            {t('admin:settings.systemConfig.systemSettings.buttons.view')}
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
              <h3 className="text-lg font-semibold text-admin-text mb-4">{t('admin:settings.systemConfig.systemHealth.overview.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-admin-text mb-2">{t('admin:settings.systemConfig.systemHealth.overview.database')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-admin-text">{t('admin:settings.systemConfig.systemHealth.labels.status')}</span>
                      <AdminBadge variant={getStatusColor(systemHealth.database.status)}>
                        {systemHealth.database.status}
                      </AdminBadge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text">{t('admin:settings.systemConfig.systemHealth.labels.responseTime')}</span>
                      <span className="text-admin-text">{systemHealth.database.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text">{t('admin:settings.systemConfig.systemHealth.labels.connections')}</span>
                      <span className="text-admin-text">{systemHealth.database.connections}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-admin-text mb-2">{t('admin:settings.systemConfig.systemHealth.overview.storage')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-admin-text">{t('admin:settings.systemConfig.systemHealth.labels.status')}</span>
                      <AdminBadge variant={getStatusColor(systemHealth.storage.status)}>
                        {systemHealth.storage.status}
                      </AdminBadge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text">{t('admin:settings.systemConfig.systemHealth.labels.usedSpace')}</span>
                      <span className="text-admin-text">
                        {Math.round((systemHealth.storage.usedSpace / systemHealth.storage.totalSpace) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">{t('admin:settings.systemConfig.systemHealth.overview.externalServices')}</h3>
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
              <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.systemConfig.emailTemplates.title')}</h3>
              <AdminButton variant="primary" size="sm">
                {t('admin:settings.systemConfig.emailTemplates.createTemplate')}
              </AdminButton>
            </div>
            
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📧</div>
              <h4 className="text-lg font-medium text-admin-text mb-2">{t('admin:settings.systemConfig.emailTemplates.title')}</h4>
              <p className="text-admin-muted mb-4">{t('admin:settings.systemConfig.emailTemplates.description')}</p>
              <AdminButton variant="primary">
                {t('admin:settings.systemConfig.emailTemplates.goToTemplates')}
              </AdminButton>
            </div>
          </AdminCard>
        )}

        {/* Create Setting Modal */}
        {showCreateSetting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-admin-text mb-4">{t('admin:settings.systemConfig.systemSettings.createModal.title')}</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.systemConfig.systemSettings.createModal.key')}</label>
                    <input
                      type="text"
                      className="admin-input w-full px-3 py-2"
                      value={newSetting.key}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.systemConfig.systemSettings.createModal.category')}</label>
                    <select
                      className="admin-input w-full px-3 py-2"
                      value={newSetting.category}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="general">{t('admin:settings.systemConfig.systemSettings.createModal.categories.general')}</option>
                      <option value="security">{t('admin:settings.systemConfig.systemSettings.createModal.categories.security')}</option>
                      <option value="email">{t('admin:settings.systemConfig.systemSettings.createModal.categories.email')}</option>
                      <option value="payment">{t('admin:settings.systemConfig.systemSettings.createModal.categories.payment')}</option>
                      <option value="storage">{t('admin:settings.systemConfig.systemSettings.createModal.categories.storage')}</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.systemConfig.systemSettings.createModal.value')}</label>
                  <textarea
                    className="admin-input w-full px-3 py-2"
                    rows={3}
                    value={newSetting.value}
                    onChange={(e) => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.systemConfig.systemSettings.createModal.description')}</label>
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
                    {t('admin:settings.systemConfig.systemSettings.createModal.encrypted')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={newSetting.isPublic}
                      onChange={(e) => setNewSetting(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    {t('admin:settings.systemConfig.systemSettings.createModal.public')}
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <AdminButton variant="primary" onClick={handleCreateSetting}>
                  {t('admin:settings.systemConfig.systemSettings.createModal.create')}
                </AdminButton>
                <AdminButton variant="outline" onClick={() => setShowCreateSetting(false)}>
                  {t('admin:settings.systemConfig.systemSettings.createModal.cancel')}
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
                      <option value="auth">{t('common:authentication')}</option>
                      <option value="payment">{t('common:payment')}</option>
                      <option value="email">{t('common:email')}</option>
                      <option value="storage">{t('common:storage')}</option>
                      <option value="analytics">{t('common:analytics')}</option>
                      <option value="other">{t('common:other')}</option>
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