import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useAssetUpload } from '../../hooks/useAssetUpload'
import SimpleAssetUploader from './SimpleAssetUploader'
import LoadingSpinner from '../ui/LoadingSpinner'
import logger from '../../utils/logger'

const BrandingSettings: React.FC = () => {
  const { settings, updateSettings, loading, error } = useSettings()

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

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Branding Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Customize your brand colors, logos, and visual identity
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Brand Colors</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  defaultValue={settings?.primaryColor || '#3B82F6'}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={settings?.primaryColor || '#3B82F6'}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  defaultValue={settings?.secondaryColor || '#10B981'}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={settings?.secondaryColor || '#10B981'}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  defaultValue={settings?.accentColor || '#F59E0B'}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={settings?.accentColor || '#F59E0B'}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Logos & Assets</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
