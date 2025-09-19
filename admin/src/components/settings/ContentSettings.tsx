import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useAssetUpload } from '../../hooks/useAssetUpload'
import SimpleAssetUploader from './SimpleAssetUploader'
import LoadingSpinner from '../ui/LoadingSpinner'

const ContentSettings: React.FC = () => {
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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Content Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Manage your homepage content and hero section
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Hero Image</h4>
          <SimpleAssetUploader
            currentAssetId={settings?.heroImageAssetId}
            onUpload={handleHeroImageUpload}
            accept="image/*"
            maxSize={10 * 1024 * 1024}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-700">
              Hero Title
            </label>
            <input
              type="text"
              name="heroTitle"
              id="heroTitle"
              defaultValue={settings?.heroTitle || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700">
              Hero Subtitle
            </label>
            <textarea
              name="heroSubtitle"
              id="heroSubtitle"
              rows={3}
              defaultValue={settings?.heroSubtitle || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="heroButtonText" className="block text-sm font-medium text-gray-700">
                Button Text
              </label>
              <input
                type="text"
                name="heroButtonText"
                id="heroButtonText"
                defaultValue={settings?.heroButtonText || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="heroButtonLink" className="block text-sm font-medium text-gray-700">
                Button Link
              </label>
              <input
                type="url"
                name="heroButtonLink"
                id="heroButtonLink"
                defaultValue={settings?.heroButtonLink || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
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
    </div>
  )
}

export default ContentSettings
