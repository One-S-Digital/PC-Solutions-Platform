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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Configure third-party integrations and API keys
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Authentication (Clerk)</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="clerkPublishableKey" className="block text-sm font-medium text-gray-700">
                Clerk Publishable Key
              </label>
              <input
                type="text"
                name="clerkPublishableKey"
                id="clerkPublishableKey"
                defaultValue={settings?.clerkPublishableKey || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="pk_test_..."
              />
            </div>

            <div>
              <label htmlFor="clerkSecretKey" className="block text-sm font-medium text-gray-700">
                Clerk Secret Key
              </label>
              <input
                type="password"
                name="clerkSecretKey"
                id="clerkSecretKey"
                defaultValue={settings?.clerkSecretKey || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="sk_test_..."
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Analytics</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="googleAnalyticsId" className="block text-sm font-medium text-gray-700">
                Google Analytics ID
              </label>
              <input
                type="text"
                name="googleAnalyticsId"
                id="googleAnalyticsId"
                defaultValue={settings?.googleAnalyticsId || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="GA-XXXXXXXXX-X"
              />
            </div>

            <div>
              <label htmlFor="facebookPixelId" className="block text-sm font-medium text-gray-700">
                Facebook Pixel ID
              </label>
              <input
                type="text"
                name="facebookPixelId"
                id="facebookPixelId"
                defaultValue={settings?.facebookPixelId || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="123456789012345"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default IntegrationSettings
