import React, { useState, useRef } from 'react'

interface SimpleAssetUploaderProps {
  currentAssetId?: string
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSize?: number
  className?: string
}

const SimpleAssetUploader: React.FC<SimpleAssetUploaderProps> = ({
  onUpload,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  className = ''
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    setError(null)

    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    const acceptedTypes = accept.split(',').map(type => type.trim())
    const isValidType = acceptedTypes.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/')
      if (type.includes('*')) {
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType)
      }
      return file.type === type
    })

    if (!isValidType) {
      setError(`File type not supported. Accepted types: ${accept}`)
      return
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError('Upload failed. Please try again.')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-lg border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-sm text-gray-600">
            {isUploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>
                {' or drag and drop'}
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {accept} up to {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

export default SimpleAssetUploader
