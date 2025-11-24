import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useAssetUpload } from '../../hooks/useAssetUpload'
import SimpleAssetUploader from './SimpleAssetUploader'
import LoadingSpinner from '../ui/LoadingSpinner'
import { useTranslation } from 'react-i18next'

const ContentSettings: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const { settings, updateSettings, loading, error, saving } = useSettings()
  const { uploadAsset } = useAssetUpload()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    await updateSettings({
      heroTitle: formData.get('heroTitle') as string,
      heroSubtitle: formData.get('heroSubtitle') as string,
      heroButtonText: formData.get('heroButtonText') as string,
      heroButtonLink: formData.get('heroButtonLink') as string,
    })
  }

  const handleHeroImageUpload = async (file: File) => {
    const asset = await uploadAsset(file, 'heroImage')
    if (asset) {
      await updateSettings({
        heroImageAssetId: asset.id
      })
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-swiss-charcoal">{t('admin:settings.content.title')}</h3>
        <p className="mt-1 text-gray-500">
          {t('admin:settings.content.description')}
        </p>
      </div>

      {error && (
        <div className="rounded-card bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        {/* Hero Image */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.content.heroImage.title')}</h4>
          <SimpleAssetUploader
            currentAssetId={settings?.heroImageAssetId}
            onUpload={handleHeroImageUpload}
            accept="image/*"
            maxSize={10 * 1024 * 1024}
          />
        </div>

        {/* Hero Content */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">{t('admin:settings.content.heroContent.title')}</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="heroTitle" className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.content.heroContent.heroTitle')}
              </label>
              <input
                type="text"
                name="heroTitle"
                id="heroTitle"
                defaultValue={settings?.heroTitle || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('admin:settings.content.heroContent.heroTitlePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="heroSubtitle" className="block text-sm font-medium text-swiss-charcoal mb-2">
                {t('admin:settings.content.heroContent.heroSubtitle')}
              </label>
              <textarea
                name="heroSubtitle"
                id="heroSubtitle"
                rows={3}
                defaultValue={settings?.heroSubtitle || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('admin:settings.content.heroContent.heroSubtitlePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="heroButtonText" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.content.heroContent.buttonText')}
                </label>
                <input
                  type="text"
                  name="heroButtonText"
                  id="heroButtonText"
                  defaultValue={settings?.heroButtonText || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  placeholder={t('admin:settings.content.heroContent.buttonTextPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="heroButtonLink" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  {t('admin:settings.content.heroContent.buttonLink')}
                </label>
                <input
                  type="url"
                  name="heroButtonLink"
                  id="heroButtonLink"
                  defaultValue={settings?.heroButtonLink || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  placeholder={t('admin:settings.content.heroContent.buttonLinkPlaceholder')}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center rounded-button bg-swiss-teal py-2.5 px-6 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {saving ? t('admin:settings.content.saving') : t('admin:settings.content.saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ContentSettings
