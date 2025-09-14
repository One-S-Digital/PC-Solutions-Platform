import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

export enum AssetKind {
  AVATAR = 'AVATAR',
  LOGO = 'LOGO',
  COVER_IMAGE = 'COVER_IMAGE',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  DOCUMENT = 'DOCUMENT',
  CV = 'CV',
  CATALOG_PDF = 'CATALOG_PDF',
  CATALOG_CSV = 'CATALOG_CSV'
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (asset: any) => void;
  assetKind: AssetKind;
  maxSize?: number;
  allowedTypes?: string[];
  title?: string;
  description?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  assetKind,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  title,
  description,
}: UploadModalProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds maximum allowed size of ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError(`File type ${file.type} is not allowed`);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assetKind', assetKind);

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
      onUploadComplete(result.asset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setError(null);
      setUploadProgress(null);
      onClose();
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // This would be implemented based on your auth setup
    // For now, return empty string
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />
        
        <div className="relative bg-surface-1 rounded-lg shadow-pop max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-text-strong">
              {title || t('upload.title', 'Upload File')}
            </h3>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="text-text-muted hover:text-text-strong disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {description && (
              <p className="text-text-muted text-sm mb-4">{description}</p>
            )}

            {/* Upload Area */}
            <div
              className={clsx(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                dragActive ? 'border-accent bg-accent/5' : 'border-border',
                selectedFile ? 'border-success bg-success/5' : ''
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  <p className="text-text-strong font-medium">{selectedFile.name}</p>
                  <p className="text-text-muted text-sm">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-text-muted hover:text-text-strong text-sm"
                  >
                    {t('upload.changeFile', 'Change file')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📤</div>
                  <p className="text-text-strong">
                    {t('upload.dragDrop', 'Drag and drop your file here')}
                  </p>
                  <p className="text-text-muted text-sm">
                    {t('upload.orClick', 'or click to browse')}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 bg-accent text-accent-contrast rounded-md hover:opacity-90 transition"
                  >
                    {t('upload.browse', 'Browse Files')}
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={allowedTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-text-muted mb-1">
                  <span>{t('upload.uploading', 'Uploading...')}</span>
                  <span>{uploadProgress.percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-surface-2 rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-md">
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            {/* File Requirements */}
            <div className="mt-4 text-xs text-text-muted">
              <p>{t('upload.allowedTypes', 'Allowed types')}: {allowedTypes.join(', ')}</p>
              <p>{t('upload.maxSize', 'Maximum size')}: {Math.round(maxSize / (1024 * 1024))}MB</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 text-text-muted hover:text-text-strong disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-accent text-accent-contrast rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? t('upload.uploading', 'Uploading...') : t('upload.upload', 'Upload')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}