import React, { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useApiClient } from '../../services/api'
import { apiService } from '../../services/api'
import { useUser } from '@clerk/clerk-react'
import SimpleAssetUploader from './SimpleAssetUploader'
import LoadingSpinner from '../ui/LoadingSpinner'
import Card from '../design-system/Card'
import Button from '../design-system/Button'
import { STANDARD_INPUT_FIELD } from '../../constants/design-system'
import logger from '../../utils/logger'
import toast from 'react-hot-toast'

const BrandingSettings: React.FC = () => {
  const { settings, updateSettings, refreshSettings, loading, error, saving } = useSettings()
  const apiClient = useApiClient()
  const { user } = useUser()
  const [uploadingAssets, setUploadingAssets] = useState<Record<string, boolean>>({})
  const [uploadedAssets, setUploadedAssets] = useState<Record<string, string>>({})


  const handleUploadAndUpdate = async (assetType: string, file: File) => {
    setUploadingAssets(prev => ({ ...prev, [assetType]: true }))
    
    try {
      console.log('🔄 Starting upload for:', assetType, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        apiBaseUrl: import.meta.env.VITE_API_URL || '/api'
      })

      const formData = new FormData()
      formData.append('file', file)

      let response
      switch (assetType) {
        case 'logo':
          response = await apiService.uploadLogo(apiClient, formData)
          break
        case 'adminLogo':
          response = await apiService.uploadAdminLogo(apiClient, formData)
          break
        case 'favicon':
          response = await apiService.uploadFavicon(apiClient, formData)
          break
        case 'adminFavicon':
          response = await apiService.uploadAdminFavicon(apiClient, formData)
          break
        default:
          throw new Error(`Unknown asset type: ${assetType}`)
      }

      console.log('✅ Upload response for', assetType, ':', response)

      if (response.data && response.data.success) {
        // Store the uploaded asset ID for the save button
        setUploadedAssets(prev => ({ ...prev, [assetType]: response.data.data.id }))
        
        toast.success(`${assetType} uploaded successfully!`)
        logger.log(`✅ ${assetType} uploaded successfully`)
      } else {
        throw new Error(response.data?.message || 'Upload failed')
      }
    } catch (e) {
      console.error('❌ Upload error for', assetType, ':', e)
      logger.error('Failed to upload asset:', assetType, e)
      toast.error(`Failed to upload ${assetType}. Please try again.`)
      throw e
    } finally {
      setUploadingAssets(prev => ({ ...prev, [assetType]: false }))
    }
  }

  const handleSaveAsset = async (assetType: string) => {
    const assetId = uploadedAssets[assetType]
    if (!assetId) {
      toast.error('No asset to save. Please upload a file first.')
      return
    }

    try {
      const assetIdField = `${assetType}AssetId`
      await updateSettings({ [assetIdField]: assetId })
      
      // Refresh settings to get the updated asset data
      await refreshSettings()
      
      // Clear the uploaded asset from state
      setUploadedAssets(prev => ({ ...prev, [assetType]: '' }))
      
      toast.success(`${assetType} saved successfully!`)
      logger.log(`✅ ${assetType} saved successfully`)
    } catch (e) {
      logger.error('Failed to save asset:', assetType, e)
      toast.error(`Failed to save ${assetType}. Please try again.`)
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
      toast.success('Brand colors saved successfully!')
      logger.log('✅ Branding settings saved successfully!')
    } catch (error) {
      logger.error('❌ Error saving branding settings:', error)
      toast.error('Failed to save brand colors. Please try again.')
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
        <Card className="bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </Card>
      )}

      <div className="space-y-6">
        {/* Brand Colors */}
        <Card className="p-6">
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
                    className="h-10 w-20 rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    defaultValue={settings?.primaryColor || '#3B82F6'}
                    className={STANDARD_INPUT_FIELD}
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
                    className="h-10 w-20 rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    name="secondaryColor"
                    defaultValue={settings?.secondaryColor || '#10B981'}
                    className={STANDARD_INPUT_FIELD}
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
                    className="h-10 w-20 rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    name="accentColor"
                    defaultValue={settings?.accentColor || '#F59E0B'}
                    className={STANDARD_INPUT_FIELD}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Colors'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Admin Dashboard Colors */}
        <Card className="p-6">
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
                    className="h-10 w-20 rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    name="adminPrimaryColor"
                    defaultValue={settings?.adminPrimaryColor || '#1F2937'}
                    className={STANDARD_INPUT_FIELD}
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
                    className="h-10 w-20 rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    name="adminSecondaryColor"
                    defaultValue={settings?.adminSecondaryColor || '#374151'}
                    className={STANDARD_INPUT_FIELD}
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
                    className="h-10 w-20 rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    name="adminAccentColor"
                    defaultValue={settings?.adminAccentColor || '#3B82F6'}
                    className={STANDARD_INPUT_FIELD}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Admin Colors'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Logos & Assets */}
        <Card className="p-6">
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
                fetchDelay={0}
              />
              {uploadingAssets.logo && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Uploading logo...</span>
                  </div>
                </div>
              )}
              {uploadedAssets.logo && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">✓ Logo uploaded! Click "Save Logo" below to apply changes.</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('logo')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Logo'}
                    </Button>
                  </div>
                </div>
              )}
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
                fetchDelay={300}
              />
              {uploadingAssets.adminLogo && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Uploading admin logo...</span>
                  </div>
                </div>
              )}
              {uploadedAssets.adminLogo && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">✓ Admin logo uploaded! Click "Save Admin Logo" below to apply changes.</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('adminLogo')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Admin Logo'}
                    </Button>
                  </div>
                </div>
              )}
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
                fetchDelay={600}
              />
              {uploadingAssets.favicon && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Uploading favicon...</span>
                  </div>
                </div>
              )}
              {uploadedAssets.favicon && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">✓ Favicon uploaded! Click "Save Favicon" below to apply changes.</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('favicon')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Favicon'}
                    </Button>
                  </div>
                </div>
              )}
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
                fetchDelay={900}
              />
              {uploadingAssets.adminFavicon && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Uploading admin favicon...</span>
                  </div>
                </div>
              )}
              {uploadedAssets.adminFavicon && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">✓ Admin favicon uploaded! Click "Save Admin Favicon" below to apply changes.</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('adminFavicon')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Admin Favicon'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default BrandingSettings
