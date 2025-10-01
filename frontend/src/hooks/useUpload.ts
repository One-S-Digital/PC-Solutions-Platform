import { useState, useCallback } from 'react';
import { uploadService } from '../services/upload';
import { Asset, AssetKind } from '../services/types';

// Hook for file uploads
export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<Asset | null>(null);

  const uploadFile = useCallback(async (
    file: File, 
    kind: AssetKind, 
    options?: {
      usePresignedUrl?: boolean;
      validate?: boolean;
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    }
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedFile(null);

    try {
      // Validate file if options provided
      if (options?.validate) {
        const validation = uploadService.validateFile(file, {
          maxSize: options.maxSize,
          allowedTypes: options.allowedTypes,
          allowedExtensions: options.allowedExtensions,
        });

        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Upload file
      const asset = options?.usePresignedUrl
        ? await uploadService.uploadFileWithPresignedUrl(file, kind, setProgress)
        : await uploadService.uploadFile(file, kind, setProgress);

      setUploadedFile(asset);
      return asset;
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedFile(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedFile,
    uploadFile,
    reset,
  };
};

// Hook for multiple file uploads
export const useMultipleFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Asset[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  const uploadFiles = useCallback(async (
    files: File[], 
    kind: AssetKind, 
    options?: {
      validate?: boolean;
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    }
  ) => {
    setUploading(true);
    setProgress({});
    setError(null);
    setUploadedFiles([]);
    setCompletedCount(0);

    try {
      // Validate all files if options provided
      if (options?.validate) {
        for (const file of files) {
          const validation = uploadService.validateFile(file, {
            maxSize: options.maxSize,
            allowedTypes: options.allowedTypes,
            allowedExtensions: options.allowedExtensions,
          });

          if (!validation.valid) {
            throw new Error(`File ${file.name}: ${validation.error}`);
          }
        }
      }

      // Upload files
      const assets = await uploadService.uploadMultipleFiles(
        files, 
        kind, 
        (progress, fileIndex) => {
          setProgress(prev => ({ ...prev, [fileIndex]: progress }));
        }
      );

      setUploadedFiles(assets);
      setCompletedCount(files.length);
      return assets;
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({});
    setError(null);
    setUploadedFiles([]);
    setCompletedCount(0);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedFiles,
    completedCount,
    uploadFiles,
    reset,
  };
};

// Hook for image uploads
export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<Asset | null>(null);

  const uploadImage = useCallback(async (
    file: File, 
    kind: AssetKind, 
    options?: {
      resize?: { width?: number; height?: number; quality?: number };
      generateThumbnail?: boolean;
      validate?: boolean;
      maxSize?: number;
    }
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedImage(null);

    try {
      // Validate file if options provided
      if (options?.validate) {
        const validation = uploadService.validateFile(file, {
          maxSize: options.maxSize,
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        });

        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Upload image
      const asset = await uploadService.uploadImage(
        file, 
        kind, 
        {
          resize: options?.resize,
          generateThumbnail: options?.generateThumbnail,
        },
        setProgress
      );

      setUploadedImage(asset);
      return asset;
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedImage(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedImage,
    uploadImage,
    reset,
  };
};

// Hook for document uploads
export const useDocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<Asset | null>(null);

  const uploadDocument = useCallback(async (
    file: File, 
    kind: AssetKind, 
    options?: {
      extractText?: boolean;
      generatePreview?: boolean;
      validate?: boolean;
      maxSize?: number;
    }
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedDocument(null);

    try {
      // Validate file if options provided
      if (options?.validate) {
        const validation = uploadService.validateFile(file, {
          maxSize: options.maxSize,
          allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/csv',
          ],
          allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'csv'],
        });

        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Upload document
      const asset = await uploadService.uploadDocument(
        file, 
        kind, 
        {
          extractText: options?.extractText,
          generatePreview: options?.generatePreview,
        },
        setProgress
      );

      setUploadedDocument(asset);
      return asset;
    } catch (err: any) {
      setError(err.message || 'Document upload failed');
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedDocument(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedDocument,
    uploadDocument,
    reset,
  };
};

// Hook for video uploads
export const useVideoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<Asset | null>(null);

  const uploadVideo = useCallback(async (
    file: File, 
    kind: AssetKind, 
    options?: {
      generateThumbnail?: boolean;
      compress?: boolean;
      quality?: 'low' | 'medium' | 'high';
      validate?: boolean;
      maxSize?: number;
    }
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadedVideo(null);

    try {
      // Validate file if options provided
      if (options?.validate) {
        const validation = uploadService.validateFile(file, {
          maxSize: options.maxSize,
          allowedTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
          allowedExtensions: ['mp4', 'avi', 'mov', 'wmv'],
        });

        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Upload video
      const asset = await uploadService.uploadVideo(
        file, 
        kind, 
        {
          generateThumbnail: options?.generateThumbnail,
          compress: options?.compress,
          quality: options?.quality,
        },
        setProgress
      );

      setUploadedVideo(asset);
      return asset;
    } catch (err: any) {
      setError(err.message || 'Video upload failed');
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedVideo(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedVideo,
    uploadVideo,
    reset,
  };
};

// Hook for file management
export const useFileManagement = () => {
  const [files, setFiles] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchFiles = useCallback(async (params?: {
    page?: number;
    limit?: number;
    kind?: AssetKind;
    search?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await uploadService.getUserFiles(params);
      setFiles(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (assetId: string) => {
    setLoading(true);
    setError(null);

    try {
      await uploadService.deleteFile(assetId);
      setFiles(prev => prev.filter(file => file.id !== assetId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFiles = useCallback(async (query: string, filters?: {
    kind?: AssetKind;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const results = await uploadService.searchFiles(query, filters);
      setFiles(results);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Error searching files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    files,
    loading,
    error,
    pagination,
    fetchFiles,
    deleteFile,
    searchFiles,
  };
};

// Hook for upload limits and validation
export const useUploadLimits = () => {
  const [limits, setLimits] = useState<{
    maxFileSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
    maxFilesPerUpload: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await uploadService.getUploadLimits();
      setLimits(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch upload limits');
      console.error('Error fetching upload limits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const validateFile = useCallback((file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }) => {
    return uploadService.validateFile(file, options);
  }, []);

  return {
    limits,
    loading,
    error,
    fetchLimits,
    validateFile,
  };
};

export default useFileUpload;