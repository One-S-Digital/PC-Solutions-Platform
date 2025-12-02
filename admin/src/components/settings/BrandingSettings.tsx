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
import { useTranslation } from 'react-i18next'

const BrandingSettings: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
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
        case 'sidebarLogo':
          response = await apiService.uploadSidebarLogo(apiClient, formData)
          break
        default:
          throw new Error(`Unknown asset type: ${assetType}`)
      }

      console.log('✅ Upload response for', assetType, ':', response)

      if (response.data && response.data.success) {
        // Store the uploaded asset ID for the save button
        setUploadedAssets(prev => ({ ...prev, [assetType]: response.data.data.id }))
        
        toast.success(t('admin:settings.branding.assetUploaded', { assetType }))
        logger.log(`✅ ${assetType} uploaded successfully`)
      } else {
        throw new Error(response.data?.message || 'Upload failed')
      }
    } catch (e) {
      console.error('❌ Upload error for', assetType, ':', e)
      logger.error('Failed to upload asset:', assetType, e)
      toast.error(t('admin:settings.branding.assetUploadFailed', { assetType }))
      throw e
    } finally {
      setUploadingAssets(prev => ({ ...prev, [assetType]: false }))
    }
  }

  const handleSaveAsset = async (assetType: string) => {
    const assetId = uploadedAssets[assetType]
    if (!assetId) {
      toast.error(t('admin:settings.branding.noAssetToSave'))
      return
    }

    try {
      const assetIdField = `${assetType}AssetId`
      await updateSettings({ [assetIdField]: assetId })
      
      // Refresh settings to get the updated asset data
      await refreshSettings()
      
      // Clear the uploaded asset from state
      setUploadedAssets(prev => ({ ...prev, [assetType]: '' }))
      
      toast.success(t('admin:settings.branding.assetSaved', { assetType }))
      logger.log(`✅ ${assetType} saved successfully`)
    } catch (e) {
      logger.error('Failed to save asset:', assetType, e)
      toast.error(t('admin:settings.branding.assetSaveFailed', { assetType }))
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
      toast.success(t('admin:settings.branding.brandColorsSaved'))
      logger.log('✅ Branding settings saved successfully!')
    } catch (error) {
      logger.error('❌ Error saving branding settings:', error)
      toast.error(t('admin:settings.branding.brandColorsSaveFailed'))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-swiss-charcoal">{t('admin:settings.branding.title')}</h3>
        <p className="mt-1 text-gray-500">
          {t('admin:settings.branding.description')}
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
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.branding.brandColors.title')}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.branding.brandColors.primaryColor')}
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
                  {t('admin:settings.branding.brandColors.secondaryColor')}
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
                  {t('admin:settings.branding.brandColors.accentColor')}
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
                {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveColors')}
              </Button>
            </div>
          </form>
        </Card>

        {/* Admin Dashboard Colors */}
        <Card className="p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.branding.adminColors.title')}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.branding.adminColors.adminPrimaryColor')}
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
                  {t('admin:settings.branding.adminColors.adminSecondaryColor')}
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
                  {t('admin:settings.branding.adminColors.adminAccentColor')}
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
                {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveAdminColors')}
              </Button>
            </div>
          </form>
        </Card>

        {/* Logos & Assets */}
        <Card className="p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.branding.logosAssets.title')}</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.branding.logosAssets.mainLogo')}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {t('admin:settings.branding.logosAssets.mainLogoDescription')}
              </p>
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
                    <span className="text-sm text-blue-700">{t('admin:settings.branding.uploading.logo')}</span>
                  </div>
                </div>
              )}
              {uploadedAssets.logo && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">{t('admin:settings.branding.uploaded.logo')}</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('logo')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveLogo')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.branding.logosAssets.sidebarLogo')}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {t('admin:settings.branding.logosAssets.sidebarLogoDescription')}
              </p>
              <SimpleAssetUploader
                currentAssetId={settings?.sidebarLogoAssetId}
                onUpload={(file: File) => handleUploadAndUpdate('sidebarLogo', file)}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
                fetchDelay={200}
              />
              {uploadingAssets.sidebarLogo && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">{t('admin:settings.branding.uploading.sidebarLogo')}</span>
                  </div>
                </div>
              )}
              {uploadedAssets.sidebarLogo && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">{t('admin:settings.branding.uploaded.sidebarLogo')}</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('sidebarLogo')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveSidebarLogo')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.branding.logosAssets.adminLogo')}
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
                    <span className="text-sm text-blue-700">{t('admin:settings.branding.uploading.adminLogo')}</span>
                  </div>
                </div>
              )}
              {uploadedAssets.adminLogo && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">{t('admin:settings.branding.uploaded.adminLogo')}</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('adminLogo')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveAdminLogo')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.branding.logosAssets.favicon')}
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
                    <span className="text-sm text-blue-700">{t('admin:settings.branding.uploading.favicon')}</span>
                  </div>
                </div>
              )}
              {uploadedAssets.favicon && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">{t('admin:settings.branding.uploaded.favicon')}</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('favicon')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveFavicon')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.branding.logosAssets.adminFavicon')}
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
                    <span className="text-sm text-blue-700">{t('admin:settings.branding.uploading.adminFavicon')}</span>
                  </div>
                </div>
              )}
              {uploadedAssets.adminFavicon && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">{t('admin:settings.branding.uploaded.adminFavicon')}</span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveAsset('adminFavicon')}
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? t('admin:settings.branding.saving') : t('admin:settings.branding.saveAdminFavicon')}
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
