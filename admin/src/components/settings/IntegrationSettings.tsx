import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import LoadingSpinner from '../ui/LoadingSpinner'

const IntegrationSettings: React.FC = () => {
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
        <h3 className="text-xl font-semibold text-swiss-charcoal">Integration Settings</h3>
        <p className="mt-1 text-gray-500">
          Configure third-party integrations and API keys
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
            <h4 className="text-lg font-medium text-swiss-charcoal mb-6">Authentication (Clerk)</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="clerkPublishableKey" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Clerk Publishable Key
                </label>
                <input
                  type="text"
                  name="clerkPublishableKey"
                  id="clerkPublishableKey"
                  defaultValue={settings?.clerkPublishableKey || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="pk_test_..."
                />
              </div>

              <div>
                <label htmlFor="clerkSecretKey" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Clerk Secret Key
                </label>
                <input
                  type="password"
                  name="clerkSecretKey"
                  id="clerkSecretKey"
                  defaultValue={settings?.clerkSecretKey || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="sk_test_..."
                />
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div>
            <h4 className="text-lg font-medium text-swiss-charcoal mb-6">Analytics</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="googleAnalyticsId" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Google Analytics ID
                </label>
                <input
                  type="text"
                  name="googleAnalyticsId"
                  id="googleAnalyticsId"
                  defaultValue={settings?.googleAnalyticsId || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="GA-XXXXXXXXX-X"
                />
              </div>

              <div>
                <label htmlFor="facebookPixelId" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  name="facebookPixelId"
                  id="facebookPixelId"
                  defaultValue={settings?.facebookPixelId || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="123456789012345"
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
              {saving ? 'Saving...' : 'Save Integration Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IntegrationSettings
