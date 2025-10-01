import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Select, Badge } from '@repo/ui';
import { Settings, Shield, Database, Clock, Key, Globe, Bell, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformSettings {
  id?: string;
  platformName: string;
  platformDescription?: string;
  platformVersion: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  maxFileUploadSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  twoFactorRequired: boolean;
  apiRateLimit: number;
  backupFrequency: string;
  logRetentionDays: number;
}

const PlatformSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'ProCrèche Solutions Suisse',
    platformDescription: '',
    platformVersion: '1.0.0',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    maxFileUploadSize: 10485760,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    sessionTimeout: 3600,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    twoFactorRequired: false,
    apiRateLimit: 1000,
    backupFrequency: 'daily',
    logRetentionDays: 90,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/platform-settings');
      const data = await response.json();
      
      if (data.success && data.data) {
        setSettings(data.data);
        setMaintenanceMode(data.data.maintenanceMode);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/platform-settings', {
        method: settings.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Platform settings saved successfully');
        if (data.data) {
          setSettings(data.data);
        }
      } else {
        throw new Error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save platform settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const response = await fetch('/api/platform-settings/maintenance-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !maintenanceMode }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMaintenanceMode(!maintenanceMode);
        toast.success(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`);
      } else {
        throw new Error(data.message || 'Failed to toggle maintenance mode');
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleInputChange = (field: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileTypesChange = (value: string) => {
    const types = value.split(',').map(t => t.trim()).filter(t => t);
    handleInputChange('allowedFileTypes', types);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Database },
    { id: 'maintenance', label: 'Maintenance', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure global platform settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {maintenanceMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Bell className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-yellow-800">
              Maintenance mode is currently enabled. Users will see a maintenance message.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-swiss-mint text-swiss-mint'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Platform Name"
                  value={settings.platformName}
                  onChange={(e) => handleInputChange('platformName', e.target.value)}
                />
                <Input
                  label="Platform Version"
                  value={settings.platformVersion}
                  onChange={(e) => handleInputChange('platformVersion', e.target.value)}
                />
              </div>
              
              <Textarea
                label="Platform Description"
                value={settings.platformDescription || ''}
                onChange={(e) => handleInputChange('platformDescription', e.target.value)}
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <label className="font-medium">Registration Enabled</label>
                    <p className="text-sm text-gray-500">Allow new user registrations</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.registrationEnabled}
                    onChange={(e) => handleInputChange('registrationEnabled', e.target.checked)}
                    className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <label className="font-medium">Email Verification Required</label>
                    <p className="text-sm text-gray-500">Require email verification for new accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailVerificationRequired}
                    onChange={(e) => handleInputChange('emailVerificationRequired', e.target.checked)}
                    className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Session Timeout (seconds)"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                />
                <Input
                  label="Minimum Password Length"
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <label className="font-medium">Require Special Characters</label>
                    <p className="text-sm text-gray-500">Require special characters in passwords</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.passwordRequireSpecial}
                    onChange={(e) => handleInputChange('passwordRequireSpecial', e.target.checked)}
                    className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <label className="font-medium">Two-Factor Authentication Required</label>
                    <p className="text-sm text-gray-500">Require 2FA for all users</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.twoFactorRequired}
                    onChange={(e) => handleInputChange('twoFactorRequired', e.target.checked)}
                    className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                  />
                </div>
              </div>

              <Input
                label="API Rate Limit (requests per hour)"
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => handleInputChange('apiRateLimit', parseInt(e.target.value))}
              />
            </div>
          </Card>
        )}

        {activeTab === 'system' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Settings
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Max File Upload Size (bytes)"
                  type="number"
                  value={settings.maxFileUploadSize}
                  onChange={(e) => handleInputChange('maxFileUploadSize', parseInt(e.target.value))}
                  help={`Current: ${(settings.maxFileUploadSize / (1024 * 1024)).toFixed(1)} MB`}
                />
                <Input
                  label="Log Retention (days)"
                  type="number"
                  value={settings.logRetentionDays}
                  onChange={(e) => handleInputChange('logRetentionDays', parseInt(e.target.value))}
                />
              </div>

              <Input
                label="Allowed File Types"
                value={settings.allowedFileTypes.join(', ')}
                onChange={(e) => handleFileTypesChange(e.target.value)}
                help="Comma-separated list of allowed file extensions"
              />

              <Select
                label="Backup Frequency"
                value={settings.backupFrequency}
                onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </div>
          </Card>
        )}

        {activeTab === 'maintenance' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Maintenance Mode
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <label className="font-medium">Maintenance Mode</label>
                  <p className="text-sm text-gray-500">
                    Enable maintenance mode to show a maintenance message to users
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={toggleMaintenanceMode}
                  className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                />
              </div>

              {maintenanceMode && (
                <Textarea
                  label="Maintenance Message"
                  value={settings.platformDescription || ''}
                  onChange={(e) => handleInputChange('platformDescription', e.target.value)}
                  rows={3}
                  placeholder="Enter maintenance message..."
                />
              )}

              <div className="flex items-center gap-2">
                <Badge variant={maintenanceMode ? 'error' : 'success'}>
                  {maintenanceMode ? 'Maintenance Mode Active' : 'Normal Operation'}
                </Badge>
                {maintenanceMode && (
                  <Badge variant="info">
                    <Clock className="h-3 w-3 mr-1" />
                    Since: {new Date().toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlatformSettingsPage;