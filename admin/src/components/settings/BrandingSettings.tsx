import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useAssetUpload } from '../../hooks/useAssetUpload'
import SimpleAssetUploader from './SimpleAssetUploader'
import LoadingSpinner from '../ui/LoadingSpinner'
import logger from '../../utils/logger'

const BrandingSettings: React.FC = () => {
  const { settings, updateSettings, loading, error, saving } = useSettings()

  const { uploadAsset } = useAssetUpload()

  const handleUploadAndUpdate = async (assetType: string, file: File) => {
    try {
      const asset = await uploadAsset(file, assetType)
      if (asset) {
        await updateSettings({ [`${assetType}AssetId`]: asset.id })
      }
    } catch (e) {
      logger.error('Failed to upload and update asset:', assetType, e)
      // You might want to show an error to the user here

    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    const updates = {
      primaryColor: formData.get('primaryColor') as string,
      secondaryColor: formData.get('secondaryColor') as string,
      accentColor: formData.get('accentColor') as string,
      adminPrimaryColor: formData.get('adminPrimaryColor') as string,
      adminSecondaryColor: formData.get('adminSecondaryColor') as string,
      adminAccentColor: formData.get('adminAccentColor') as string,
    }
    
    try {
      await updateSettings(updates)
      logger.log('✅ Branding settings saved successfully!')
    } catch (error) {
      logger.error('❌ Error saving branding settings:', error)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-swiss-charcoal">Branding Settings</h3>
        <p className="mt-1 text-gray-500">
          Customize your brand colors, logos, and visual identity
        </p>
      </div>

      {error && (
        <div className="rounded-card bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        {/* Brand Colors */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">Brand Colors</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="primaryColor"
                    defaultValue={settings?.primaryColor || '#3B82F6'}
                    className="h-10 w-20 rounded-input border border-gray-300"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    defaultValue={settings?.primaryColor || '#3B82F6'}
                    className="flex-1 rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="secondaryColor"
                    defaultValue={settings?.secondaryColor || '#10B981'}
                    className="h-10 w-20 rounded-input border border-gray-300"
                  />
                  <input
                    type="text"
                    name="secondaryColor"
                    defaultValue={settings?.secondaryColor || '#10B981'}
                    className="flex-1 rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={settings?.accentColor || '#F59E0B'}
                    className="h-10 w-20 rounded-input border border-gray-300"
                  />
                  <input
                    type="text"
                    name="accentColor"
                    defaultValue={settings?.accentColor || '#F59E0B'}
                    className="flex-1 rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
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
                {saving ? 'Saving...' : 'Save Colors'}
              </button>
            </div>
          </form>
        </div>

        {/* Admin Dashboard Colors */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">Admin Dashboard Colors</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Admin Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="adminPrimaryColor"
                    defaultValue={settings?.adminPrimaryColor || '#1F2937'}
                    className="h-10 w-20 rounded-input border border-gray-300"
                  />
                  <input
                    type="text"
                    name="adminPrimaryColor"
                    defaultValue={settings?.adminPrimaryColor || '#1F2937'}
                    className="flex-1 rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Admin Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="adminSecondaryColor"
                    defaultValue={settings?.adminSecondaryColor || '#374151'}
                    className="h-10 w-20 rounded-input border border-gray-300"
                  />
                  <input
                    type="text"
                    name="adminSecondaryColor"
                    defaultValue={settings?.adminSecondaryColor || '#374151'}
                    className="flex-1 rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Admin Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    name="adminAccentColor"
                    defaultValue={settings?.adminAccentColor || '#3B82F6'}
                    className="h-10 w-20 rounded-input border border-gray-300"
                  />
                  <input
                    type="text"
                    name="adminAccentColor"
                    defaultValue={settings?.adminAccentColor || '#3B82F6'}
                    className="flex-1 rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
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
                {saving ? 'Saving...' : 'Save Admin Colors'}
              </button>
            </div>
          </form>
        </div>

        {/* Logos & Assets */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">Logos & Assets</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                Main Logo
              </label>
              <SimpleAssetUploader
                currentAssetId={settings?.logoAssetId}
                onUpload={(file: File) => handleUploadAndUpdate('logo', file)}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                Admin Logo
              </label>
              <SimpleAssetUploader
                currentAssetId={settings?.adminLogoAssetId}
                onUpload={(file: File) => handleUploadAndUpdate('adminLogo', file)}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                Favicon
              </label>
              <SimpleAssetUploader
                currentAssetId={settings?.faviconAssetId}
                onUpload={(file: File) => handleUploadAndUpdate('favicon', file)}
                accept="image/x-icon,image/png"
                maxSize={1 * 1024 * 1024}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                Admin Favicon
              </label>
              <SimpleAssetUploader
                currentAssetId={settings?.adminFaviconAssetId}
                onUpload={(file: File) => handleUploadAndUpdate('adminFavicon', file)}
                accept="image/x-icon,image/png"
                maxSize={1 * 1024 * 1024}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandingSettings
