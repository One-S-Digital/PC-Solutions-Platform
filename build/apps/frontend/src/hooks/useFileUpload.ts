import { useState, useCallback } from 'react';
import { AssetKind } from '@prisma/client';

export interface Asset {
  id: string;
  kind: AssetKind;
  filename: string;
  publicUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface UploadOptions {
  assetKind: AssetKind;
  maxSize?: number;
  allowedTypes?: string[];
}

export interface UploadResult {
  success: boolean;
  asset?: Asset;
  error?: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetKind', options.assetKind);

      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      return {
        success: true,
        asset: result.asset,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const generatePresignedUpload = useCallback(async (
    filename: string,
    mimeType: string,
    assetKind: AssetKind
  ) => {
    try {
      const response = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          filename,
          mimeType,
          assetKind,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate upload URL');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to generate upload URL');
    }
  }, []);

  const uploadWithPresignedUrl = useCallback(async (
    file: File,
    presignedData: any
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      // Upload to R2 using presigned URL
      const formData = new FormData();
      Object.entries(presignedData.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);

      const uploadResponse = await fetch(presignedData.url, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to storage');
      }

      // Create asset record in database
      const assetResponse = await fetch('/api/upload/asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          storageKey: presignedData.key,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          assetKind: presignedData.assetKind,
        }),
      });

      if (!assetResponse.ok) {
        const errorData = await assetResponse.json();
        throw new Error(errorData.message || 'Failed to create asset record');
      }

      const result = await assetResponse.json();
      return {
        success: true,
        asset: result.asset,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const deleteAsset = useCallback(async (assetId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/upload/asset/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete asset:', error);
      return false;
    }
  }, []);

  const getAssets = useCallback(async (options?: {
    kind?: AssetKind;
    limit?: number;
    offset?: number;
  }): Promise<Asset[]> => {
    try {
      const params = new URLSearchParams();
      if (options?.kind) params.append('kind', options.kind);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const response = await fetch(`/api/upload/assets?${params}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const result = await response.json();
      return result.assets;
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      return [];
    }
  }, []);

  const getDownloadUrl = useCallback(async (assetId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/upload/download/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate download URL');
      }

      const result = await response.json();
      return result.downloadUrl;
    } catch (error) {
      console.error('Failed to get download URL:', error);
      return null;
    }
  }, []);

  return {
    uploadFile,
    generatePresignedUpload,
    uploadWithPresignedUrl,
    deleteAsset,
    getAssets,
    getDownloadUrl,
    uploading,
    progress,
  };
}

async function getAuthToken(): Promise<string> {
  // This would be implemented based on your auth setup
  // For now, return empty string
  return '';
}