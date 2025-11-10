import React, { useState, useRef, useCallback } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { apiService, useApiClient } from '../services/api';
import { retryWithBackoff, RetryPresets } from '../utils/retryUtility';
import { UploadedAsset } from '../types/api';


interface AssetUploaderProps {
  kind: 'logo' | 'admin_logo' | 'favicon' | 'admin_favicon' | 'hero';
  currentAsset?: {
    id: string;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  } | null;
  fallbackUrl?: string;
  onAssetChange: (asset: UploadedAsset | null) => void;
  onFallbackUrlChange: (url: string) => void;
  label: string;
  description?: string;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  requireSquare?: boolean;
}

const AssetUploader: React.FC<AssetUploaderProps> = ({
  kind,
  currentAsset,
  fallbackUrl,
  onAssetChange,
  onFallbackUrlChange,
  label,
  description,
  maxSize = 2 * 1024 * 1024, // 2MB default
  acceptedTypes = ['image/png', 'image/svg+xml'],
  requireSquare = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiClient = useApiClient();

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Only ${acceptedTypes.join(', ')} files are allowed`;
    }

    const actualMaxSize = (kind.includes('favicon')) ? 256 * 1024 : maxSize;
    if (file.size > actualMaxSize) {
      return `File size must be less than ${Math.round(actualMaxSize / 1024)}KB`;
    }

    return null;
  };

  const getErrorMessage = (error: unknown): string => {
    const err = error as {
      response?: { data?: { detail?: string; message?: string; error?: string }; status?: number };
      message?: string;
    };
    const detail = err.response?.data?.detail ||
                  err.response?.data?.message ||
                  err.response?.data?.error ||
                  err.message;
    
    if (!detail) {
      return 'Upload failed. Please check your file and try again.';
    }

    if (detail.includes('Database operation failed')) {
      return 'Upload service temporarily unavailable. Please try again later.';
    }
    if (detail.includes('File size') && detail.includes('exceeds limit')) {
      return detail; // Storage service already provides good size error messages
    }
    if (detail.includes('File type') && detail.includes('not allowed')) {
      return detail; // Storage service provides good type error messages
    }
    if (detail.includes('must be square')) {
      return detail; // Storage service provides good dimension error messages
    }
    if (detail.includes('Could not detect file type')) {
      return 'Invalid file format. Please upload a valid image file.';
    }
    if (detail.includes('Could not determine image dimensions')) {
      return 'Unable to process image. Please try a different file.';
    }
    if (detail.includes('SVG file contains unsafe content')) {
      return 'SVG file contains unsafe content. Please use a clean SVG file.';
    }
    
    if (typeof detail === 'string' && detail.length > 10 && detail.length < 200) {
      return detail;
    }
    
    return 'Upload failed. Please check your file and try again.';
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);

      const result = await retryWithBackoff(
        async () => apiService.uploadAsset(apiClient, formData, (progress) => {
          setUploadProgress(progress);
        }),
        {
          ...RetryPresets.upload,
          onRetry: (error, attempt, delay) => {
            console.log(`Upload retry attempt ${attempt} after ${delay}ms:`, error.message);
            setUploadProgress(0); // Reset progress on retry
          },
        }
      );

      if (!result.success) {
        throw result.error;
      }

      const response = result.data;
      
      if (response?.data.success) {
        const assetData = response.data.data;
        setUploadProgress(100);
        onAssetChange(assetData);
        setShowUrlInput(false);
      } else {
        setError(response?.data.message || 'Upload failed');
      }

    } catch (error: unknown) {
      console.error('Upload error:', error);

      const err = error as { code?: string; message?: string; response?: { status?: number } };

      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {

        setError('Network error. Please check your connection and try again.');
        return;
      }

      if (err.response?.status === 401) {
        setError('Authentication required. Please log in and try again.');
        return;
      }

      if (err.response?.status === 403) {
        setError('You do not have permission to upload files.');
        return;
      }

      if ((err.response?.status ?? 0) >= 500) {
        setError('Server error. Please try again later.');
        return;
      }

      setError(getErrorMessage(error));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleRemoveAsset = () => {
    onAssetChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPreviewUrl = () => {
    if (currentAsset) return currentAsset.url;
    if (fallbackUrl) return fallbackUrl;
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : currentAsset
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : currentAsset ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">{currentAsset.filename}</p>
            <p className="text-xs text-gray-500">
              {Math.round(currentAsset.size / 1024)}KB • {currentAsset.mimeType}
              {currentAsset.width && currentAsset.height && (
                <span> • {currentAsset.width}×{currentAsset.height}</span>
              )}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveAsset();
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedTypes.join(', ')} • Max {Math.round((kind.includes('favicon') ? 256 * 1024 : maxSize) / 1024)}KB
              {requireSquare && ' • Must be square'}
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
          <div className="flex items-center space-x-3">
            {currentAsset?.mimeType === 'image/svg+xml' || previewUrl.endsWith('.svg') ? (
              <div 
                className="w-16 h-16 border border-gray-200 rounded bg-white flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: `<img src="${previewUrl}" alt="Preview" style="max-width: 100%; max-height: 100%;" />` }}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-16 h-16 object-contain border border-gray-200 rounded bg-white"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement?.appendChild(
                    Object.assign(document.createElement('div'), {
                      className: target.className,
                      innerHTML: '<div class="flex items-center justify-center h-full text-gray-400"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg></div>'
                    })
                  );
                }}
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {currentAsset ? 'Uploaded Asset' : 'Fallback URL'}
              </p>
              <p className="text-xs text-gray-500 break-all">{previewUrl}</p>
            </div>
          </div>
        </div>
      )}

      {/* URL Fallback Option */}
      <div className="pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showUrlInput ? 'Hide' : 'Use'} URL instead
        </button>

        {showUrlInput && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fallback URL
            </label>
            <input
              type="url"
              value={fallbackUrl || ''}
              onChange={(e) => onFallbackUrlChange(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              This URL will be used if no asset is uploaded
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetUploader;
