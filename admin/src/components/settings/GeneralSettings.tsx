import React, { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import LoadingSpinner from '../ui/LoadingSpinner'
import logger from '../../utils/logger'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useApiClient } from '../../services/api'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Settings as SettingsIcon, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  isEncrypted: boolean;
  isPublic: boolean;
}

const GeneralSettings: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const { settings, updateSettings, loading, error, saving } = useSettings()
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [emailGracePeriodDays, setEmailGracePeriodDays] = useState<string>('7')
  const [savingEmailGracePeriod, setSavingEmailGracePeriod] = useState(false)
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  // Platform settings queries
  const { data: platformSettings, isLoading: platformLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      if (!apiClient) return null
      const response = await apiClient.get('/api/platform-settings')
      return response.data
    },
    enabled: !!apiClient,
  })

  // Fetch email grace period setting from system configuration
  const { data: systemSettings, isLoading: systemSettingsLoading } = useQuery({
    queryKey: ['system-settings-email'],
    queryFn: async () => {
      if (!apiClient) return null
      const response = await apiClient.get('/api/admin/system-configuration/settings?category=email')
      return response.data as SystemSetting[]
    },
    enabled: !!apiClient,
  })

  // Update local state when system settings are fetched
  useEffect(() => {
    if (systemSettings && Array.isArray(systemSettings)) {
      const gracePeriodSetting = systemSettings.find(s => s.key === 'email.grace_period_days')
      if (gracePeriodSetting) {
        const value = typeof gracePeriodSetting.value === 'number' 
          ? gracePeriodSetting.value.toString() 
          : String(gracePeriodSetting.value || 7)
        setEmailGracePeriodDays(value)
      }
    }
  }, [systemSettings])

  // Maintenance mode mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: async (data: { maintenanceMode: boolean; maintenanceMessage?: string }) => {
      if (!apiClient) throw new Error('API client not available')
      return apiClient.put('/api/platform-settings', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
      toast.success(t('admin:settings.general.platformSettings.updateMessage'))
    },
    onError: () => {
      toast.error(t('admin:settings.general.platformSettings.updateMessage'))
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    logger.log('🚀 Form submitted!')
    const formData = new FormData(e.target as HTMLFormElement)
    
    const updates = {
      siteName: formData.get('siteName') as string,
      siteDescription: formData.get('siteDescription') as string,
      contactEmail: formData.get('contactEmail') as string,
      contactPhone: formData.get('contactPhone') as string,
    }
    
    logger.log('📋 Form data extracted:', updates)
    
    try {
      await updateSettings(updates)
      logger.log('✅ Settings saved successfully!')
    } catch (error) {
      logger.error('❌ Error saving settings:', error)
    }
  }

  const handleMaintenanceToggle = async () => {
    const newMaintenanceMode = !maintenanceMode
    setMaintenanceMode(newMaintenanceMode)
    
    updateMaintenanceMutation.mutate({
      maintenanceMode: newMaintenanceMode,
      maintenanceMessage: newMaintenanceMode ? maintenanceMessage : undefined
    })
  }

  const handleMaintenanceMessageUpdate = async () => {
    updateMaintenanceMutation.mutate({
      maintenanceMode,
      maintenanceMessage
    })
  }

  // Handle email grace period update
  const handleEmailGracePeriodUpdate = async () => {
    if (!apiClient) {
      toast.error(t('admin:settings.general.userEmailSettings.authRequired', 'Authentication required'))
      return
    }

    const days = parseInt(emailGracePeriodDays)
    if (isNaN(days) || days < 0 || days > 365) {
      toast.error(t('admin:settings.general.userEmailSettings.invalidDays', 'Please enter a valid number of days (0-365)'))
      return
    }

    setSavingEmailGracePeriod(true)
    try {
      await apiClient.put('/api/admin/system-configuration/settings/email.grace_period_days', {
        value: days,
        description: 'Number of days to keep old email addresses before automatic deletion after an email change. This grace period allows users to recover access if needed.',
      })
      
      queryClient.invalidateQueries({ queryKey: ['system-settings-email'] })
      toast.success(t('admin:settings.general.userEmailSettings.updated', 'Email grace period updated successfully'))
      logger.log('✅ Email grace period setting updated to:', days)
    } catch (err) {
      logger.error('❌ Failed to update email grace period:', err)
      toast.error(t('admin:settings.general.userEmailSettings.updateFailed', 'Failed to update email grace period setting'))
    } finally {
      setSavingEmailGracePeriod(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-swiss-charcoal">{t('admin:settings.general.title')}</h3>
        <p className="mt-1 text-gray-500">
          {t('admin:settings.general.description')}
        </p>
      </div>

      {error && (
        <div className="rounded-card bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="siteName" className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.general.siteName')}
              </label>
              <input
                type="text"
                name="siteName"
                id="siteName"
                defaultValue={settings?.siteName || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('admin:settings.general.siteNamePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.general.contactEmail')}
              </label>
              <input
                type="email"
                name="contactEmail"
                id="contactEmail"
                defaultValue={settings?.contactEmail || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('admin:settings.general.contactEmailPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="siteDescription" className="block text-sm font-medium text-swiss-charcoal mb-2">
              {t('admin:settings.general.siteDescription')}
            </label>
            <textarea
              name="siteDescription"
              id="siteDescription"
              rows={3}
              defaultValue={settings?.siteDescription || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder={t('admin:settings.general.siteDescriptionPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-swiss-charcoal mb-2">
              {t('admin:settings.general.contactPhone')}
            </label>
            <input
              type="tel"
              name="contactPhone"
              id="contactPhone"
              defaultValue={settings?.contactPhone || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder={t('admin:settings.general.contactPhonePlaceholder')}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-button bg-swiss-teal py-2.5 px-6 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving ? t('admin:settings.general.saving') : t('admin:settings.general.saveChanges')}
            </button>
          </div>
        </form>
      </div>

      {/* Platform Settings Section */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <SettingsIcon className="h-5 w-5 text-swiss-teal" />
          <h3 className="text-xl font-semibold text-swiss-charcoal">{t('admin:settings.general.platformSettings.title')}</h3>
        </div>

        {/* Maintenance Mode */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              {maintenanceMode ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <h4 className="font-medium text-gray-900">{t('admin:settings.general.platformSettings.maintenanceMode')}</h4>
                <p className="text-sm text-gray-500">
                  {maintenanceMode 
                    ? t('admin:settings.general.platformSettings.maintenanceModeActive')
                    : t('admin:settings.general.platformSettings.maintenanceModeInactive')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleMaintenanceToggle}
              disabled={updateMaintenanceMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 ${
                maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {maintenanceMode && (
            <div className="space-y-3">
              <label htmlFor="maintenanceMessage" className="block text-sm font-medium text-gray-700">
                {t('admin:settings.general.platformSettings.maintenanceMessage')}
              </label>
              <textarea
                id="maintenanceMessage"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('admin:settings.general.platformSettings.maintenanceMessagePlaceholder')}
              />
              <button
                onClick={handleMaintenanceMessageUpdate}
                disabled={updateMaintenanceMutation.isPending}
                className="inline-flex justify-center rounded-button bg-swiss-teal py-2 px-4 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {updateMaintenanceMutation.isPending ? t('admin:settings.general.platformSettings.updating') : t('admin:settings.general.platformSettings.updateMessage')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Email Settings Section */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Mail className="h-5 w-5 text-swiss-teal" />
          <h3 className="text-xl font-semibold text-swiss-charcoal">
            {t('admin:settings.general.userEmailSettings.title', 'User Email Settings')}
          </h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-4">
              <div>
                <label htmlFor="emailGracePeriodDays" className="block text-sm font-medium text-gray-900 mb-1">
                  {t('admin:settings.general.userEmailSettings.gracePeriodLabel', 'Email Change Grace Period (Days)')}
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  {t('admin:settings.general.userEmailSettings.gracePeriodDescription', 
                    'When a user changes their email address, the old email is retained for this many days before being automatically deleted. This allows users to recover their account if needed. Set to 0 to delete immediately.'
                  )}
                </p>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    id="emailGracePeriodDays"
                    min="0"
                    max="365"
                    value={emailGracePeriodDays}
                    onChange={(e) => setEmailGracePeriodDays(e.target.value)}
                    disabled={systemSettingsLoading}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="7"
                  />
                  <span className="text-sm text-gray-500">
                    {t('admin:settings.general.userEmailSettings.daysLabel', 'days')}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleEmailGracePeriodUpdate}
                  disabled={savingEmailGracePeriod || systemSettingsLoading}
                  className="inline-flex justify-center rounded-button bg-swiss-teal py-2 px-4 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {savingEmailGracePeriod 
                    ? t('admin:settings.general.userEmailSettings.saving', 'Saving...') 
                    : t('admin:settings.general.userEmailSettings.saveButton', 'Save Email Settings')
                  }
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>{t('admin:settings.general.userEmailSettings.noteTitle', 'Note:')}</strong>{' '}
              {t('admin:settings.general.userEmailSettings.noteDescription', 
                'This setting also exists in System Config → System Settings under the "email" category as "email.grace_period_days".'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneralSettings
