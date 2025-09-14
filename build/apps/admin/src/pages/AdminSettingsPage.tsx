import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  AdminCard, 
  AdminButton, 
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  AdminBadge,
  AdminStatus,
  AdminMetric
} from '@repo/ui';
import FileUploadComponent from '../components/FileUploadComponent';

interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxUsersPerOrganization: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  logRetentionDays: number;
  apiRateLimit: number;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  maxUsers: number;
  maxOrganizations: number;
  isActive: boolean;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  apiRequestsToday: number;
  errorRate: number;
}

interface FrontendSettings {
  id: string;
  siteName: string;
  siteDescription?: string;
  siteKeywords?: string;
  primaryColor: string;
  secondaryColor: string;
  adminPrimaryColor: string;
  adminSecondaryColor: string;
  adminAccentColor: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  cookiePolicyUrl?: string;
  enableDarkMode: boolean;
  defaultTheme: string;
  mainAppCustomization?: any;
  adminCustomization?: any;
  logoAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
  };
  faviconAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
  };
  ogImageAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
  };
  adminLogoAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
  };
}

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'system' | 'subscriptions' | 'monitoring' | 'security' | 'frontend'>('overview');
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    maintenanceMessage: 'System is currently under maintenance. Please try again later.',
    maxUsersPerOrganization: 50,
    emailNotifications: true,
    smsNotifications: false,
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    logRetentionDays: 30,
    apiRateLimit: 1000,
    sessionTimeout: 3600,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    }
  });
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [frontendSettings, setFrontendSettings] = useState<FrontendSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchSubscriptionTiers();
    fetchMetrics();
    fetchFrontendSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchSubscriptionTiers = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-tiers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSubscriptionTiers(result.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription tiers:', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMetrics(result.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFrontendSettings = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/frontend-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFrontendSettings(result.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch frontend settings:', err);
    }
  };

  const updateSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const token = await getToken();
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      alert('Settings updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updatePasswordPolicy = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      passwordPolicy: { ...prev.passwordPolicy, [key]: value }
    }));
  };

  const updateFrontendSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const token = await getToken();
      const response = await fetch('/api/admin/frontend-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update frontend settings');
      }

      alert('Frontend settings updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFrontendSetting = (key: string, value: any) => {
    setFrontendSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const uploadFile = async (file: File, type: 'logo' | 'favicon' | 'og-image' | 'admin-logo') => {
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/admin/frontend-settings/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const assetKey = type === 'logo' ? 'logoAsset' : 
                        type === 'favicon' ? 'faviconAsset' : 
                        type === 'og-image' ? 'ogImageAsset' : 'adminLogoAsset';
        updateFrontendSetting(assetKey, result.data);
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
      } else {
        throw new Error(`Failed to upload ${type}`);
      }
    } catch (err: any) {
      alert(`Failed to upload ${type}: ${err.message}`);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          enabled: !settings.maintenanceMode,
          message: settings.maintenanceMessage 
        }),
      });

      if (response.ok) {
        updateSetting('maintenanceMode', !settings.maintenanceMode);
        alert(`Maintenance mode ${!settings.maintenanceMode ? 'enabled' : 'disabled'}`);
      }
    } catch (err: any) {
      alert('Failed to toggle maintenance mode');
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminMetric
          label="Total Users"
          value={metrics?.totalUsers || 0}
          icon="👥"
        />
        <AdminMetric
          label="Active Users"
          value={metrics?.activeUsers || 0}
          change={{ value: 5, type: 'increase' }}
          icon="🔗"
        />
        <AdminMetric
          label="System Load"
          value={`${metrics?.systemLoad || 0}%`}
          change={{ value: 2, type: 'increase' }}
          icon="⚡"
        />
        <AdminMetric
          label="Error Rate"
          value={`${metrics?.errorRate || 0}%`}
          change={{ value: 15, type: 'decrease' }}
          icon="📊"
        />
      </div>

      {/* System Status */}
      <AdminCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">System Status</h3>
        <div className="space-y-3">
          <AdminStatus variant={settings.maintenanceMode ? 'critical' : 'low'}>
            <span>{settings.maintenanceMode ? '🚨' : '✅'}</span>
            <span>
              {settings.maintenanceMode 
                ? 'System is in maintenance mode' 
                : 'All systems operational'
              }
            </span>
          </AdminStatus>
          
          <AdminStatus variant="low">
            <span>💾</span>
            <span>Database backup: {settings.autoBackupEnabled ? 'Enabled' : 'Disabled'}</span>
          </AdminStatus>
          
          <AdminStatus variant="medium">
            <span>📧</span>
            <span>Email notifications: {settings.emailNotifications ? 'Enabled' : 'Disabled'}</span>
          </AdminStatus>
          
          <AdminStatus variant="low">
            <span>🔒</span>
            <span>Security policies: Active</span>
          </AdminStatus>
        </div>
      </AdminCard>

      {/* Quick Actions */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminButton 
            variant={settings.maintenanceMode ? 'danger' : 'primary'}
            onClick={toggleMaintenanceMode}
            className="w-full"
          >
            {settings.maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </AdminButton>
          
          <AdminButton variant="secondary" className="w-full">
            Run Database Backup
          </AdminButton>
          
          <AdminButton variant="secondary" className="w-full">
            Clear System Cache
          </AdminButton>
          
          <AdminButton variant="secondary" className="w-full">
            Export System Logs
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <AdminCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">System Configuration</h3>
        
        <div className="space-y-6">
          {/* Maintenance Settings */}
          <div>
            <h4 className="text-md font-medium text-admin-text mb-3">Maintenance Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-admin-text">Maintenance Mode</label>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => updateSetting('maintenanceMode', e.target.checked)}
                  className="rounded border-admin-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">
                  Maintenance Message
                </label>
                <textarea
                  className="admin-input w-full px-3 py-2"
                  rows={3}
                  value={settings.maintenanceMessage}
                  onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* User Limits */}
          <div>
            <h4 className="text-md font-medium text-admin-text mb-3">User Limits</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">
                  Max Users per Organization
                </label>
                <input
                  type="number"
                  className="admin-input w-full px-3 py-2"
                  value={settings.maxUsersPerOrganization}
                  onChange={(e) => updateSetting('maxUsersPerOrganization', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div>
            <h4 className="text-md font-medium text-admin-text mb-3">Backup Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-admin-text">Auto Backup Enabled</label>
                <input
                  type="checkbox"
                  checked={settings.autoBackupEnabled}
                  onChange={(e) => updateSetting('autoBackupEnabled', e.target.checked)}
                  className="rounded border-admin-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">
                  Backup Frequency
                </label>
                <select
                  className="admin-select w-full px-3 py-2"
                  value={settings.backupFrequency}
                  onChange={(e) => updateSetting('backupFrequency', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">
                  Log Retention (Days)
                </label>
                <input
                  type="number"
                  className="admin-input w-full px-3 py-2"
                  value={settings.logRetentionDays}
                  onChange={(e) => updateSetting('logRetentionDays', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div>
            <h4 className="text-md font-medium text-admin-text mb-3">API Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">
                  API Rate Limit (requests/hour)
                </label>
                <input
                  type="number"
                  className="admin-input w-full px-3 py-2"
                  value={settings.apiRateLimit}
                  onChange={(e) => updateSetting('apiRateLimit', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  className="admin-input w-full px-3 py-2"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="flex justify-end">
            <AdminButton
              variant="primary"
              onClick={updateSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );

  const renderSubscriptionsTab = () => (
    <div className="space-y-6">
      <AdminCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-admin-text">Subscription Tiers</h3>
          <AdminButton variant="primary">Add New Tier</AdminButton>
        </div>

        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHeaderCell>Tier Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Price</AdminTableHeaderCell>
              <AdminTableHeaderCell>Max Users</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {subscriptionTiers.map((tier) => (
              <AdminTableRow key={tier.id}>
                <AdminTableCell>{tier.name}</AdminTableCell>
                <AdminTableCell>CHF {tier.price}/month</AdminTableCell>
                <AdminTableCell>{tier.maxUsers}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge variant={tier.isActive ? 'low' : 'medium'}>
                    {tier.isActive ? 'Active' : 'Inactive'}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  <div className="flex gap-2">
                    <AdminButton variant="outline" size="sm">Edit</AdminButton>
                    <AdminButton variant="danger" size="sm">Delete</AdminButton>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminCard>
    </div>
  );

  const renderFrontendTab = () => (
    <div className="space-y-6">
      {/* Main Application Site Information */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Main Application Site Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Site Name
            </label>
            <input
              type="text"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.siteName || ''}
              onChange={(e) => updateFrontendSetting('siteName', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Site Description
            </label>
            <textarea
              className="admin-input w-full px-3 py-2"
              rows={3}
              value={frontendSettings?.siteDescription || ''}
              onChange={(e) => updateFrontendSetting('siteDescription', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Site Keywords
            </label>
            <input
              type="text"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.siteKeywords || ''}
              onChange={(e) => updateFrontendSetting('siteKeywords', e.target.value)}
              placeholder="childcare, daycare, switzerland, education"
            />
          </div>
        </div>
      </AdminCard>

      {/* Main Application Branding */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Main Application Branding</h3>
        
        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Logo
            </label>
            <FileUploadComponent
              currentFile={frontendSettings?.logoAsset}
              onFileSelect={(file) => uploadFile(file, 'logo')}
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              previewWidth={200}
              previewHeight={100}
            />
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Favicon
            </label>
            <FileUploadComponent
              currentFile={frontendSettings?.faviconAsset}
              onFileSelect={(file) => uploadFile(file, 'favicon')}
              accept="image/*"
              maxSize={1 * 1024 * 1024} // 1MB
              previewWidth={32}
              previewHeight={32}
            />
          </div>

          {/* OG Image Upload */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Open Graph Image (for social media sharing)
            </label>
            <FileUploadComponent
              currentFile={frontendSettings?.ogImageAsset}
              onFileSelect={(file) => uploadFile(file, 'og-image')}
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              previewWidth={400}
              previewHeight={200}
            />
          </div>

          {/* Color Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-12 h-8 rounded border border-admin-border"
                  value={frontendSettings?.primaryColor || '#3B82F6'}
                  onChange={(e) => updateFrontendSetting('primaryColor', e.target.value)}
                />
                <input
                  type="text"
                  className="admin-input flex-1 px-3 py-2"
                  value={frontendSettings?.primaryColor || '#3B82F6'}
                  onChange={(e) => updateFrontendSetting('primaryColor', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-12 h-8 rounded border border-admin-border"
                  value={frontendSettings?.secondaryColor || '#1E40AF'}
                  onChange={(e) => updateFrontendSetting('secondaryColor', e.target.value)}
                />
                <input
                  type="text"
                  className="admin-input flex-1 px-3 py-2"
                  value={frontendSettings?.secondaryColor || '#1E40AF'}
                  onChange={(e) => updateFrontendSetting('secondaryColor', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Admin Dashboard Settings */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Admin Dashboard Settings</h3>
        
        <div className="space-y-6">
          {/* Admin Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Admin Logo
            </label>
            <FileUploadComponent
              currentFile={frontendSettings?.adminLogoAsset}
              onFileSelect={(file) => uploadFile(file, 'admin-logo')}
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              previewWidth={200}
              previewHeight={100}
            />
          </div>

          {/* Admin Color Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Admin Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-12 h-8 rounded border border-admin-border"
                  value={frontendSettings?.adminPrimaryColor || '#1F2937'}
                  onChange={(e) => updateFrontendSetting('adminPrimaryColor', e.target.value)}
                />
                <input
                  type="text"
                  className="admin-input flex-1 px-3 py-2"
                  value={frontendSettings?.adminPrimaryColor || '#1F2937'}
                  onChange={(e) => updateFrontendSetting('adminPrimaryColor', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Admin Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-12 h-8 rounded border border-admin-border"
                  value={frontendSettings?.adminSecondaryColor || '#374151'}
                  onChange={(e) => updateFrontendSetting('adminSecondaryColor', e.target.value)}
                />
                <input
                  type="text"
                  className="admin-input flex-1 px-3 py-2"
                  value={frontendSettings?.adminSecondaryColor || '#374151'}
                  onChange={(e) => updateFrontendSetting('adminSecondaryColor', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Admin Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-12 h-8 rounded border border-admin-border"
                  value={frontendSettings?.adminAccentColor || '#3B82F6'}
                  onChange={(e) => updateFrontendSetting('adminAccentColor', e.target.value)}
                />
                <input
                  type="text"
                  className="admin-input flex-1 px-3 py-2"
                  value={frontendSettings?.adminAccentColor || '#3B82F6'}
                  onChange={(e) => updateFrontendSetting('adminAccentColor', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Theme Settings */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Theme Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              id="enableDarkMode" 
              className="admin-checkbox" 
              checked={frontendSettings?.enableDarkMode || false} 
              onChange={(e) => updateFrontendSetting('enableDarkMode', e.target.checked)} 
            />
            <label htmlFor="enableDarkMode" className="text-sm font-medium text-admin-text">Enable Dark Mode</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">Default Theme</label>
            <select className="admin-input w-full px-3 py-2" value={frontendSettings?.defaultTheme || 'light'} onChange={(e) => updateFrontendSetting('defaultTheme', e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Contact Information */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Contact Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Contact Email
            </label>
            <input
              type="email"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.contactEmail || ''}
              onChange={(e) => updateFrontendSetting('contactEmail', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.contactPhone || ''}
              onChange={(e) => updateFrontendSetting('contactPhone', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Contact Address
            </label>
            <textarea
              className="admin-input w-full px-3 py-2"
              rows={3}
              value={frontendSettings?.contactAddress || ''}
              onChange={(e) => updateFrontendSetting('contactAddress', e.target.value)}
            />
          </div>
        </div>
      </AdminCard>

      {/* Social Media */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Social Media</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Facebook URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.facebookUrl || ''}
              onChange={(e) => updateFrontendSetting('facebookUrl', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Twitter URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.twitterUrl || ''}
              onChange={(e) => updateFrontendSetting('twitterUrl', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.linkedinUrl || ''}
              onChange={(e) => updateFrontendSetting('linkedinUrl', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Instagram URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.instagramUrl || ''}
              onChange={(e) => updateFrontendSetting('instagramUrl', e.target.value)}
            />
          </div>
        </div>
      </AdminCard>

      {/* SEO Settings */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">SEO Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Meta Title
            </label>
            <input
              type="text"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.metaTitle || ''}
              onChange={(e) => updateFrontendSetting('metaTitle', e.target.value)}
              maxLength={60}
            />
            <p className="text-xs text-admin-muted mt-1">
              {frontendSettings?.metaTitle?.length || 0}/60 characters
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Meta Description
            </label>
            <textarea
              className="admin-input w-full px-3 py-2"
              rows={3}
              value={frontendSettings?.metaDescription || ''}
              onChange={(e) => updateFrontendSetting('metaDescription', e.target.value)}
              maxLength={160}
            />
            <p className="text-xs text-admin-muted mt-1">
              {frontendSettings?.metaDescription?.length || 0}/160 characters
            </p>
          </div>
        </div>
      </AdminCard>

      {/* Analytics */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Analytics</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Google Analytics ID
            </label>
            <input
              type="text"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.googleAnalyticsId || ''}
              onChange={(e) => updateFrontendSetting('googleAnalyticsId', e.target.value)}
              placeholder="GA-XXXXXXXXX-X"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Google Tag Manager ID
            </label>
            <input
              type="text"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.googleTagManagerId || ''}
              onChange={(e) => updateFrontendSetting('googleTagManagerId', e.target.value)}
              placeholder="GTM-XXXXXXX"
            />
          </div>
        </div>
      </AdminCard>

      {/* Legal Pages */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Legal Pages</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Privacy Policy URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.privacyPolicyUrl || ''}
              onChange={(e) => updateFrontendSetting('privacyPolicyUrl', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Terms of Service URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.termsOfServiceUrl || ''}
              onChange={(e) => updateFrontendSetting('termsOfServiceUrl', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Cookie Policy URL
            </label>
            <input
              type="url"
              className="admin-input w-full px-3 py-2"
              value={frontendSettings?.cookiePolicyUrl || ''}
              onChange={(e) => updateFrontendSetting('cookiePolicyUrl', e.target.value)}
            />
          </div>
        </div>
      </AdminCard>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="flex justify-end">
        <AdminButton
          variant="primary"
          onClick={updateFrontendSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Frontend Settings'}
        </AdminButton>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <AdminCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Password Policy</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Minimum Password Length
            </label>
            <input
              type="number"
              className="admin-input w-full px-3 py-2"
              value={settings.passwordPolicy.minLength}
              onChange={(e) => updatePasswordPolicy('minLength', parseInt(e.target.value))}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-admin-text">Require Uppercase Letters</label>
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireUppercase}
                onChange={(e) => updatePasswordPolicy('requireUppercase', e.target.checked)}
                className="rounded border-admin-border"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-admin-text">Require Numbers</label>
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireNumbers}
                onChange={(e) => updatePasswordPolicy('requireNumbers', e.target.checked)}
                className="rounded border-admin-border"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-admin-text">Require Special Characters</label>
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireSpecialChars}
                onChange={(e) => updatePasswordPolicy('requireSpecialChars', e.target.checked)}
                className="rounded border-admin-border"
              />
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Security Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminButton variant="danger" className="w-full">
            Force Password Reset (All Users)
          </AdminButton>
          
          <AdminButton variant="danger" className="w-full">
            Revoke All Sessions
          </AdminButton>
          
          <AdminButton variant="secondary" className="w-full">
            Generate Security Report
          </AdminButton>
          
          <AdminButton variant="secondary" className="w-full">
            Audit Log Access
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-admin-accent mx-auto"></div>
          <p className="mt-4 text-admin-muted">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-admin-text">Admin Settings</h1>
          <p className="text-admin-muted mt-2">Manage system configuration and settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-admin-border">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'system', label: 'System' },
                { id: 'subscriptions', label: 'Subscriptions' },
                { id: 'monitoring', label: 'Monitoring' },
                { id: 'security', label: 'Security' },
                { id: 'frontend', label: 'Frontend' }
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
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'system' && renderSystemTab()}
        {activeTab === 'subscriptions' && renderSubscriptionsTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'frontend' && renderFrontendTab()}
      </div>
    </div>
  );
}