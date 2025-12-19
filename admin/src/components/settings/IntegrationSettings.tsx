import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import LoadingSpinner from '../ui/LoadingSpinner'
import { useTranslation } from 'react-i18next'

const IntegrationSettings: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const { settings, updateSettings, loading, error, saving } = useSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    await updateSettings({
      clerkPublishableKey: formData.get('clerkPublishableKey') as string,
      clerkSecretKey: formData.get('clerkSecretKey') as string,
      googleAnalyticsId: formData.get('googleAnalyticsId') as string,
      facebookPixelId: formData.get('facebookPixelId') as string,
    })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-swiss-charcoal">{t('admin:settings.integrations.title')}</h3>
        <p className="mt-1 text-gray-500">
          {t('admin:settings.integrations.description')}
        </p>
      </div>

      {error && (
        <div className="rounded-card bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Authentication (Clerk) */}
          <div>
            <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.integrations.authentication.title')}</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="clerkPublishableKey" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.integrations.authentication.clerkPublishableKey')}
                </label>
                <input
                  type="text"
                  name="clerkPublishableKey"
                  id="clerkPublishableKey"
                  defaultValue={settings?.clerkPublishableKey || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  placeholder={t('admin:settings.integrations.authentication.clerkPublishableKeyPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="clerkSecretKey" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.integrations.authentication.clerkSecretKey')}
                </label>
                <input
                  type="password"
                  name="clerkSecretKey"
                  id="clerkSecretKey"
                  defaultValue={settings?.clerkSecretKey || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  placeholder={t('admin:settings.integrations.authentication.clerkSecretKeyPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div>
            <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.integrations.analytics.title')}</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="googleAnalyticsId" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.integrations.analytics.googleAnalyticsId')}
                </label>
                <input
                  type="text"
                  name="googleAnalyticsId"
                  id="googleAnalyticsId"
                  defaultValue={settings?.googleAnalyticsId || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  placeholder={t('admin:settings.integrations.analytics.googleAnalyticsIdPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="facebookPixelId" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.integrations.analytics.facebookPixelId')}
                </label>
                <input
                  type="text"
                  name="facebookPixelId"
                  id="facebookPixelId"
                  defaultValue={settings?.facebookPixelId || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  placeholder={t('admin:settings.integrations.analytics.facebookPixelIdPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-button bg-swiss-teal py-2.5 px-6 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving ? t('admin:settings.integrations.saving') : t('admin:settings.integrations.saveIntegrationSettings')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IntegrationSettings
