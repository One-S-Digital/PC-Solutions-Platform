import { apiClient } from './api';
import { Asset, AssetKind } from './types';

// Upload service for managing file uploads to R2 storage
export class UploadService {
  // General file upload
  async uploadFile(
    file: File, 
    kind: AssetKind, 
    onProgress?: (progress: number) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return apiClient.post<Asset>('/upload', formData, config);
  }

  // Get presigned URL for direct upload
  async getPresignedUrl(
    filename: string, 
    kind: AssetKind, 
    mimeType: string
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
  }> {
    return apiClient.post('/upload/presigned-url', {
      filename,
      kind,
      mimeType,
    });
  }

  // Upload file directly to R2 using presigned URL
  async uploadToR2(
    file: File, 
    uploadUrl: string, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (onProgress && event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  // Complete upload process (get presigned URL + upload + create asset record)
  async uploadFileWithPresignedUrl(
    file: File, 
    kind: AssetKind, 
    onProgress?: (progress: number) => void
  ): Promise<Asset> {
    // Step 1: Get presigned URL
    const { uploadUrl, publicUrl, key } = await this.getPresignedUrl(
      file.name,
      kind,
      file.type
    );

    // Step 2: Upload to R2
    await this.uploadToR2(file, uploadUrl, onProgress);

    // Step 3: Create asset record
    return apiClient.post<Asset>('/upload/complete', {
      key,
      kind,
      filename: file.name,
      publicUrl,
      mimeType: file.type,
      size: file.size,
    });
  }

  // Delete file
  async deleteFile(assetId: string): Promise<void> {
    return apiClient.delete(`/upload/${assetId}`);
  }

  // Get file info
  async getFileInfo(assetId: string): Promise<Asset> {
    return apiClient.get<Asset>(`/upload/${assetId}`);
  }

  // List user's files
  async getUserFiles(params?: {
    page?: number;
    limit?: number;
    kind?: AssetKind;
    search?: string;
  }): Promise<{
    data: Asset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.kind) queryParams.append('kind', params.kind);
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.get(`/upload/files?${queryParams.toString()}`);
  }

  // Batch upload multiple files
  async uploadMultipleFiles(
    files: File[], 
    kind: AssetKind, 
    onProgress?: (progress: number, fileIndex: number) => void
  ): Promise<Asset[]> {
    const uploadPromises = files.map(async (file, index) => {
      const asset = await this.uploadFile(file, kind, (progress) => {
        onProgress?.(progress, index);
      });
      return asset;
    });

    return Promise.all(uploadPromises);
  }

  // Validate file before upload
  validateFile(file: File, options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }): { valid: boolean; error?: string } {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options || {};

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: `File extension .${extension} is not allowed`,
        };
      }
    }

    return { valid: true };
  }

  // Get upload limits and restrictions
  async getUploadLimits(): Promise<{
    maxFileSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
    maxFilesPerUpload: number;
  }> {
    return apiClient.get('/upload/limits');
  }

  // Image-specific upload with resizing
  async uploadImage(
    file: File, 
    kind: AssetKind, 
    options?: {
      resize?: { width?: number; height?: number; quality?: number };
      generateThumbnail?: boolean;
    },
    onProgress?: (progress: number) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    if (options?.resize) {
      formData.append('resize', JSON.stringify(options.resize));
    }
    if (options?.generateThumbnail) {
      formData.append('generateThumbnail', 'true');
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return apiClient.post<Asset>('/upload/image', formData, config);
  }

  // Document upload with text extraction
  async uploadDocument(
    file: File, 
    kind: AssetKind, 
    options?: {
      extractText?: boolean;
      generatePreview?: boolean;
    },
    onProgress?: (progress: number) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    if (options?.extractText) {
      formData.append('extractText', 'true');
    }
    if (options?.generatePreview) {
      formData.append('generatePreview', 'true');
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return apiClient.post<Asset>('/upload/document', formData, config);
  }

  // Video upload with processing
  async uploadVideo(
    file: File, 
    kind: AssetKind, 
    options?: {
      generateThumbnail?: boolean;
      compress?: boolean;
      quality?: 'low' | 'medium' | 'high';
    },
    onProgress?: (progress: number) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    if (options?.generateThumbnail) {
      formData.append('generateThumbnail', 'true');
    }
    if (options?.compress) {
      formData.append('compress', 'true');
    }
    if (options?.quality) {
      formData.append('quality', options.quality);
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return apiClient.post<Asset>('/upload/video', formData, config);
  }

  // Get upload statistics
  async getUploadStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByKind: Record<AssetKind, number>;
    recentUploads: Asset[];
  }> {
    return apiClient.get('/upload/stats');
  }

  // Search files
  async searchFiles(query: string, filters?: {
    kind?: AssetKind;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Asset[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.kind) queryParams.append('kind', filters.kind);
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const response = await apiClient.get<{ data: Asset[] }>(`/upload/search?${queryParams.toString()}`);
    return response.data;
  }
}

// Create singleton instance
export const uploadService = new UploadService();

export default uploadService;