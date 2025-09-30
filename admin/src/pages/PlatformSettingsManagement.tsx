import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Globe,
  Mail,
  Shield,
  Bell,
  Database,
  Server,
  Users,
  Palette,
  Zap
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'

interface PlatformSetting {
  id: string
  category: string
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json' | 'select'
  label: string
  description: string
  options?: { value: string; label: string }[]
  required: boolean
  sensitive: boolean
}

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  environment: 'development' | 'staging' | 'production'
  lastModified: string
  modifiedBy: string
}

const PlatformSettingsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [hasChanges, setHasChanges] = useState(false)
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])

  const queryClient = useQueryClient()

  // Platform settings query
  const { data: platformSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return [
        {
          id: '1',
          category: 'general',
          key: 'app_name',
          value: 'PC Solutions',
          type: 'string',
          label: 'Application Name',
          description: 'The name displayed throughout the application',
          required: true,
          sensitive: false
        },
        {
          id: '2',
          category: 'general',
          key: 'app_version',
          value: '1.0.0',
          type: 'string',
          label: 'Application Version',
          description: 'Current version of the application',
          required: true,
          sensitive: false
        },
        {
          id: '3',
          category: 'general',
          key: 'maintenance_mode',
          value: false,
          type: 'boolean',
          label: 'Maintenance Mode',
          description: 'Enable maintenance mode to restrict access',
          required: false,
          sensitive: false
        },
        {
          id: '4',
          category: 'email',
          key: 'smtp_host',
          value: 'smtp.gmail.com',
          type: 'string',
          label: 'SMTP Host',
          description: 'SMTP server hostname',
          required: true,
          sensitive: true
        },
        {
          id: '5',
          category: 'email',
          key: 'smtp_port',
          value: 587,
          type: 'number',
          label: 'SMTP Port',
          description: 'SMTP server port',
          required: true,
          sensitive: false
        },
        {
          id: '6',
          category: 'security',
          key: 'session_timeout',
          value: 3600,
          type: 'number',
          label: 'Session Timeout (seconds)',
          description: 'How long user sessions remain active',
          required: true,
          sensitive: false
        },
        {
          id: '7',
          category: 'security',
          key: 'password_min_length',
          value: 8,
          type: 'number',
          label: 'Minimum Password Length',
          description: 'Minimum required password length',
          required: true,
          sensitive: false
        },
        {
          id: '8',
          category: 'notifications',
          key: 'email_notifications_enabled',
          value: true,
          type: 'boolean',
          label: 'Email Notifications',
          description: 'Enable email notifications for users',
          required: false,
          sensitive: false
        },
        {
          id: '9',
          category: 'notifications',
          key: 'push_notifications_enabled',
          value: false,
          type: 'boolean',
          label: 'Push Notifications',
          description: 'Enable push notifications for mobile apps',
          required: false,
          sensitive: false
        }
      ] as PlatformSetting[]
    }
  })

  // Feature flags query
  const { data: flags, isLoading: flagsLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800))
      return [
        {
          id: '1',
          name: 'new_dashboard',
          description: 'Enable the new dashboard design',
          enabled: true,
          environment: 'production' as const,
          lastModified: '2024-01-15T10:30:00Z',
          modifiedBy: 'admin@example.com'
        },
        {
          id: '2',
          name: 'advanced_analytics',
          description: 'Enable advanced analytics features',
          enabled: false,
          environment: 'production' as const,
          lastModified: '2024-01-14T15:20:00Z',
          modifiedBy: 'admin@example.com'
        },
        {
          id: '3',
          name: 'beta_features',
          description: 'Enable beta features for testing',
          enabled: true,
          environment: 'development' as const,
          lastModified: '2024-01-13T09:15:00Z',
          modifiedBy: 'admin@example.com'
        },
        {
          id: '4',
          name: 'mobile_app',
          description: 'Enable mobile app features',
          enabled: false,
          environment: 'production' as const,
          lastModified: '2024-01-12T14:45:00Z',
          modifiedBy: 'admin@example.com'
        }
      ] as FeatureFlag[]
    }
  })

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Record<string, any>) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Saving settings:', newSettings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
      setHasChanges(false)
    }
  })

  const toggleFeatureFlag = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Toggling feature flag:', id, enabled)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    }
  })

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'features', label: 'Feature Flags', icon: Zap }
  ]

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSaveSettings = () => {
    saveSettings.mutate(settings)
  }

  const handleToggleFeatureFlag = (id: string, enabled: boolean) => {
    toggleFeatureFlag.mutate({ id, enabled })
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general':
        return <Settings className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'security':
        return <Shield className="h-4 w-4" />
      case 'notifications':
        return <Bell className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'development':
        return 'bg-blue-100 text-blue-800'
      case 'staging':
        return 'bg-yellow-100 text-yellow-800'
      case 'production':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (settingsLoading || flagsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">Platform Settings</h1>
          <p className="mt-1 text-gray-500">Manage global platform configuration and feature flags</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
              queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
            }}
          >
            Refresh
          </Button>
          {hasChanges && (
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSaveSettings}
              disabled={saveSettings.isPending}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-swiss-mint text-swiss-mint'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      {activeTab !== 'features' && (
        <Card className="p-6">
          <div className="space-y-6">
            {platformSettings
              ?.filter(setting => setting.category === activeTab)
              .map((setting) => (
                <div key={setting.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getCategoryIcon(setting.category)}
                        <label className="text-sm font-medium text-gray-900">
                          {setting.label}
                        </label>
                        {setting.required && (
                          <span className="text-red-500">*</span>
                        )}
                        {setting.sensitive && (
                          <span className="text-yellow-500">🔒</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{setting.description}</p>
                      
                      {setting.type === 'string' && (
                        <input
                          type="text"
                          value={settings[setting.key] ?? setting.value}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                          placeholder={setting.label}
                        />
                      )}
                      
                      {setting.type === 'number' && (
                        <input
                          type="number"
                          value={settings[setting.key] ?? setting.value}
                          onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                          placeholder={setting.label}
                        />
                      )}
                      
                      {setting.type === 'boolean' && (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings[setting.key] ?? setting.value}
                            onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Feature Flags */}
      {activeTab === 'features' && (
        <Card className="p-6">
          <div className="space-y-4">
            {flags?.map((flag) => (
              <div key={flag.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{flag.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(flag.environment)}`}>
                        {flag.environment}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{flag.description}</p>
                    <div className="text-xs text-gray-500">
                      Last modified: {new Date(flag.lastModified).toLocaleString()} by {flag.modifiedBy}
                    </div>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        onChange={(e) => handleToggleFeatureFlag(flag.id, e.target.checked)}
                        className="sr-only peer"
                        disabled={toggleFeatureFlag.isPending}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Changes Indicator */}
      {hasChanges && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-900">
              You have unsaved changes. Click "Save Changes" to apply them.
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PlatformSettingsManagement