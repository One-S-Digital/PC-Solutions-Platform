import { useState } from 'react'
import { useApiClient } from '../services/api'
import logger from '../utils/logger'

export interface AssetUploadResult {
  id: string
  publicUrl: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  width?: number
  height?: number
}

export const useAssetUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const uploadAsset = async (file: File, kind: string): Promise<AssetUploadResult> => {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', kind)

      logger.log(`🔄 Uploading ${kind} asset:`, file.name)

      const response = await apiClient.post('/admin/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        const asset = response.data.data
        logger.log(`✅ Asset uploaded successfully:`, asset)
        return {
          id: asset.id,
          publicUrl: asset.publicUrl,
          filename: asset.filename,
          originalName: asset.originalName,
          size: asset.size,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
        }
      } else {
        throw new Error(response.data.message || 'Upload failed')
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed'

      logger.error('❌ Asset upload failed:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  return {
    uploadAsset,
    uploading,
    error,
  }
}
