import { useRef, useState } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { useAssetUpload } from '../hooks/useAssetUpload'

interface ImageUploadFieldProps {
  label: string
  currentUrl?: string | null
  assetKind: string
  onUploaded: (assetId: string, publicUrl: string) => void
  onRemove?: () => void
  aspectRatio?: 'square' | 'banner'
  disabled?: boolean
}

export function ImageUploadField({
  label,
  currentUrl,
  assetKind,
  onUploaded,
  onRemove,
  aspectRatio = 'square',
  disabled = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadAsset, uploading } = useAssetUpload()
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const displayUrl = preview ?? currentUrl

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const result = await uploadAsset(file, assetKind)
      onUploaded(result.id, result.publicUrl)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setPreview(null)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const heightClass = aspectRatio === 'banner' ? 'h-24' : 'h-24 w-24'

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${heightClass} ${aspectRatio === 'banner' ? 'w-full' : ''}`}
        >
          {displayUrl ? (
            <img src={displayUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <Image className="h-8 w-8" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
              Uploading…
            </div>
          )}
        </div>

        {!disabled && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : displayUrl ? 'Replace' : 'Upload'}
            </button>
            {displayUrl && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading || disabled}
      />
    </div>
  )
}
