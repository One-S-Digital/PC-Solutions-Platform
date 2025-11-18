import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Check, AlertCircle, File, Image, Video, FileText, Info, Tag } from 'lucide-react';
import { apiService, useApiClient } from '../services/api';
import { retryWithBackoff, RetryPresets } from '../utils/retryUtility';
import { FileTypeInfo } from '../types/api';


interface Asset {
  id: string;
  kind: string;
  category: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
  tags: string[];
  description?: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface UniversalFileUploaderProps {
  kind: string; // AssetKind as string
  currentAsset?: Asset | null;
  fallbackUrl?: string;
  onAssetChange: (asset: Asset | null) => void;
  onFallbackUrlChange?: (url: string) => void;
  
  label: string;
  description?: string;
  allowMultiple?: boolean;
  showPreview?: boolean;
  showMetadata?: boolean;
  allowTagging?: boolean;
  isPublic?: boolean;
  accessRoles?: string[];
  className?: string;
}

const UniversalFileUploader: React.FC<UniversalFileUploaderProps> = ({
  kind,
  currentAsset,
  fallbackUrl,
  onAssetChange,
  onFallbackUrlChange,
  label,
  description,
  allowMultiple = false,
  showPreview = true,
  showMetadata = true,
  allowTagging = false,
  isPublic = false,
  accessRoles = [],
  className = '',
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [fileDescription, setFileDescription] = useState('');
  const [fileTypeInfo, setFileTypeInfo] = useState<FileTypeInfo | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiClient = useApiClient();

  // Load file type information
  useEffect(() => {
    const loadFileTypeInfo = async () => {
      try {
        const response = await apiService.getFileTypeInfo(apiClient, kind);
        if (response.data.success) {
          setFileTypeInfo(response.data.data);
        }
      } catch (error) {
        logger.error('Failed to load file type info:', error);
      }
    };

    loadFileTypeInfo();
  }, [kind, apiClient]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-6 w-6" />;
    if (mimeType.startsWith('video/')) return <Video className="h-6 w-6" />;
    if (mimeType === 'application/pdf') return <FileText className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const validateFile = (file: File): string | null => {
    if (!fileTypeInfo) return 'File type information not loaded';

    // Check file size
    const maxSizeBytes = parseFloat(fileTypeInfo.maxSize.split(' ')[0]) * 
      (fileTypeInfo.maxSize.includes('MB') ? 1024 * 1024 : 
       fileTypeInfo.maxSize.includes('KB') ? 1024 : 1);
    
    if (file.size > maxSizeBytes) {
      return `File size ${formatFileSize(file.size)} exceeds limit of ${fileTypeInfo.maxSize}`;
    }

    // Check MIME type
    if (!fileTypeInfo.allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed. Allowed types: ${fileTypeInfo.allowedTypes.join(', ')}`;
    }

    return null;
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
      
      if (allowTagging && tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }
      
      if (fileDescription) {
        formData.append('description', fileDescription);
      }
      
      formData.append('isPublic', isPublic.toString());
      
      if (accessRoles.length > 0) {
        formData.append('accessRoles', JSON.stringify(accessRoles));
      }

      const result = await retryWithBackoff(
        async () => apiService.uploadUniversalFile(apiClient, formData, (progress) => {
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
        setFileDescription('');
        setError(null);
      } else {
        setError(response?.data.message || 'Upload failed');
      }


    } catch (error: unknown) {
      console.error('Upload error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Upload failed');

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

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getPreviewUrl = () => {
    if (currentAsset) return currentAsset.url;
    if (fallbackUrl) return fallbackUrl;
    return null;
  };

  const renderFileTypeCriteria = () => {
    if (!fileTypeInfo) return null;

    return (
      <div className={`mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg transition-all duration-200 ${showCriteria ? 'opacity-100' : 'opacity-90'}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-blue-800 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Upload Requirements
          </h4>
          <button
            type="button"
            onClick={() => setShowCriteria(!showCriteria)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            {showCriteria ? 'Hide' : 'Show'} details
          </button>
        </div>
        
        <p className="text-sm text-blue-700 mb-2">{fileTypeInfo.description}</p>
        
        {showCriteria && (
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-blue-800">Allowed file types:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {fileTypeInfo.allowedExtensions.map((ext, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-xs font-medium text-blue-800">Maximum file size:</span>
              <span className="ml-2 text-xs text-blue-700 font-mono">{fileTypeInfo.maxSize}</span>
            </div>
            
            {fileTypeInfo.requirements && fileTypeInfo.requirements.length > 0 && (
              <div>
                <span className="text-xs font-medium text-blue-800">Additional requirements:</span>
                <ul className="mt-1 space-y-1">
                  {fileTypeInfo.requirements.map((req, index) => (
                    <li key={index} className="text-xs text-blue-700 flex items-start">
                      <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="pt-2 border-t border-blue-200">
              <span className="text-xs font-medium text-blue-800">Examples:</span>
              <p className="text-xs text-blue-700 mt-1">{fileTypeInfo.examples}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    const previewUrl = getPreviewUrl();
    if (!showPreview || !previewUrl) return null;

    if (!currentAsset) {
      // Fallback URL preview
      return (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Image (Fallback URL)</h4>
          <img
            src={previewUrl}
            alt="Fallback preview"
            className="max-w-full max-h-32 object-contain border border-gray-200 rounded bg-white"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    const { mimeType, width, height, duration, pages } = currentAsset;

    return (
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
        
        {mimeType.startsWith('image/') && (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-48 object-contain border border-gray-200 rounded bg-white"
          />
        )}

        {mimeType.startsWith('video/') && (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-48 border border-gray-200 rounded"
          />
        )}

        {mimeType.startsWith('audio/') && (
          <audio
            src={previewUrl}
            controls
            className="w-full"
          />
        )}

        {mimeType === 'application/pdf' && (
          <div className="flex items-center p-4 border border-gray-200 rounded bg-white">
            <FileText className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="font-medium">{currentAsset.originalName}</p>
              {pages && <p className="text-sm text-gray-500">{pages} pages</p>}
            </div>
          </div>
        )}

        {!mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/') && mimeType !== 'application/pdf' && (
          <div className="flex items-center p-4 border border-gray-200 rounded bg-white">
            {getFileIcon(mimeType)}
            <div className="ml-3">
              <p className="font-medium">{currentAsset.originalName}</p>
              <p className="text-sm text-gray-500">{formatFileSize(currentAsset.size)}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetadata = () => {
    if (!showMetadata || !currentAsset) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
        <h4 className="font-medium text-gray-700 mb-2">File Information</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Size:</span> {formatFileSize(currentAsset.size)}
          </div>
          <div>
            <span className="text-gray-500">Type:</span> {currentAsset.mimeType}
          </div>
          {currentAsset.width && currentAsset.height && (
            <div>
              <span className="text-gray-500">Dimensions:</span> {currentAsset.width}×{currentAsset.height}
            </div>
          )}
          {currentAsset.duration && (
            <div>
              <span className="text-gray-500">Duration:</span> {formatDuration(currentAsset.duration)}
            </div>
          )}
          {currentAsset.pages && (
            <div>
              <span className="text-gray-500">Pages:</span> {currentAsset.pages}
            </div>
          )}
          <div className="col-span-2">
            <span className="text-gray-500">Uploaded:</span> {new Date(currentAsset.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        {currentAsset.tags.length > 0 && (
          <div className="mt-2">
            <span className="text-gray-500">Tags:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {currentAsset.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {currentAsset.description && (
          <div className="mt-2">
            <span className="text-gray-500">Description:</span>
            <p className="text-gray-700 mt-1">{currentAsset.description}</p>
          </div>
        )}

        {currentAsset.uploadedBy && (
          <div className="mt-2">
            <span className="text-gray-500">Uploaded by:</span>
            <span className="ml-2 text-gray-700">{currentAsset.uploadedBy.name}</span>
          </div>
        )}
      </div>
    );
  };

  const acceptTypes = fileTypeInfo?.allowedExtensions.join(',') || '';

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
      </div>

      {/* File Type Criteria */}
      {renderFileTypeCriteria()}

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
          accept={acceptTypes}
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
              {formatFileSize(currentAsset.size)} • {currentAsset.mimeType}
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
              {fileTypeInfo?.examples || 'Loading file requirements...'}
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
      {renderPreview()}

      {/* Metadata */}
      {renderMetadata()}

      {/* Tagging Interface */}
      {allowTagging && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tags (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add tag..."
              className="px-2 py-1 border border-gray-300 rounded text-xs"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag((e.target as HTMLInputElement).value.trim());
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Description Field */}
      {allowTagging && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            value={fileDescription}
            onChange={(e) => setFileDescription(e.target.value)}
            placeholder="Describe this file..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      )}

      {/* URL Fallback Option */}
      {onFallbackUrlChange && (
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
                This URL will be used if no file is uploaded
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversalFileUploader;