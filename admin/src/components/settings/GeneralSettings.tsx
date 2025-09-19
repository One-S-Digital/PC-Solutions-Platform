import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import LoadingSpinner from '../ui/LoadingSpinner'
import logger from '../../utils/logger'

const GeneralSettings: React.FC = () => {
  const { settings, updateSettings, loading, error, saving } = useSettings()

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

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Basic information about your application
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
              Site Name
            </label>
            <input
              type="text"
              name="siteName"
              id="siteName"
              defaultValue={settings?.siteName || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
              Contact Email
            </label>
            <input
              type="email"
              name="contactEmail"
              id="contactEmail"
              defaultValue={settings?.contactEmail || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700">
            Site Description
          </label>
          <textarea
            name="siteDescription"
            id="siteDescription"
            rows={3}
            defaultValue={settings?.siteDescription || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
            Contact Phone
          </label>
          <input
            type="tel"
            name="contactPhone"
            id="contactPhone"
            defaultValue={settings?.contactPhone || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
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

export default GeneralSettings
