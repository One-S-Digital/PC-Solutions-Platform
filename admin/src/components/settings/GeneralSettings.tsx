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
        <h3 className="text-xl font-semibold text-swiss-charcoal">General Settings</h3>
        <p className="mt-1 text-gray-500">
          Basic information about your application
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
                Site Name
              </label>
              <input
                type="text"
                name="siteName"
                id="siteName"
                defaultValue={settings?.siteName || ''}
                className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                placeholder="Enter site name"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-swiss-charcoal mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                id="contactEmail"
                defaultValue={settings?.contactEmail || ''}
                className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                placeholder="contact@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="siteDescription" className="block text-sm font-medium text-swiss-charcoal mb-2">
              Site Description
            </label>
            <textarea
              name="siteDescription"
              id="siteDescription"
              rows={3}
              defaultValue={settings?.siteDescription || ''}
              className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
              placeholder="Enter site description"
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-swiss-charcoal mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              name="contactPhone"
              id="contactPhone"
              defaultValue={settings?.contactPhone || ''}
              className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
              placeholder="+41 XX XXX XX XX"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-button bg-swiss-teal py-2.5 px-6 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GeneralSettings
