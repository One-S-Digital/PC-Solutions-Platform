import React, { useCallback, useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface FileDropZoneProps {
  label?: string
  description?: string
  helperText?: string
  accept?: string
  maxSizeMB?: number
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  selectedFile?: File | null
  disabled?: boolean
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  label,
  description,
  helperText,
  accept,
  maxSizeMB,
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const openFileDialog = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return
      const file = files[0]

      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size exceeds ${maxSizeMB}MB limit.`)
        return
      }

      onFileSelect(file)
    },
    [maxSizeMB, onFileSelect]
  )

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <div
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
            ? 'border-swiss-teal bg-swiss-teal/5'
            : 'border-gray-200 hover:border-swiss-teal'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
          accept={accept}
          disabled={disabled}
        />
        {selectedFile ? (
          <div className="flex flex-col items-center text-center space-y-2">
            <FileText className="h-10 w-10 text-swiss-teal" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {onFileRemove && !disabled && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onFileRemove()
                }}
                className="inline-flex items-center text-xs font-medium text-red-500 hover:text-red-600"
              >
                <X className="mr-1 h-4 w-4" /> Remove file
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-swiss-teal/10">
              <Upload className="h-8 w-8 text-swiss-teal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-swiss-teal">Click to browse or drag and drop</p>
              <p className="text-xs text-gray-500">{helperText || 'PDF, DOCX, MP4 (Max 50MB)'}</p>
            </div>
          </div>
        )}
      </div>
      {maxSizeMB && <p className="text-xs text-gray-400">Maximum file size: {maxSizeMB}MB</p>}
    </div>
  )
}

export default FileDropZone
