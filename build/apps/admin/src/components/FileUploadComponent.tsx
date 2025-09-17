import React, { useState, useRef, useCallback } from 'react';
import { AdminButton } from '@repo/ui';

interface FileUploadComponentProps {
  currentFile?: {
    id: string;
    publicUrl: string;
    filename: string;
  };
  onFileSelect: (file: File) => void;
  accept: string;
  maxSize: number; // in bytes
  previewWidth: number;
  previewHeight: number;
}

export default function FileUploadComponent({
  currentFile,
  onFileSelect,
  accept,
  maxSize,
  previewWidth,
  previewHeight,
}: FileUploadComponentProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }

    // Check file type
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      setError('Invalid file type');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload file
    onFileSelect(file);
    setIsUploading(false);
  }, [onFileSelect, maxSize, accept]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current File Display */}
      {currentFile && (
        <div className="flex items-center gap-4 p-4 bg-white rounded-card border border-gray-200 shadow-soft">
          <div className="flex-shrink-0">
            {currentFile.publicUrl ? (
              <img
                src={currentFile.publicUrl}
                alt="Current file"
                className="rounded-card border border-gray-200"
                style={{ width: previewWidth, height: previewHeight, objectFit: 'contain' }}
              />
            ) : (
              <div
                className="bg-admin-light rounded-card border border-gray-200 flex items-center justify-center"
                style={{ width: previewWidth, height: previewHeight }}
              >
                <span className="text-admin-charcoal text-sm">No preview</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-admin-charcoal">{currentFile.filename}</p>
            <p className="text-xs text-admin-gray">Current file</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-card p-6 transition-colors ${
          isDragOver
            ? 'border-admin-mint bg-admin-mint-light'
            : 'border-gray-300 hover:border-admin-mint/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-mint mb-2"></div>
              <p className="text-sm text-admin-charcoal">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-card bg-admin-mint-light">
                <svg
                  className="w-6 h-6 text-admin-mint"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sm text-admin-charcoal mb-2">
                {isDragOver ? 'Drop file here' : 'Drag and drop a file here, or'}
              </p>
              <AdminButton
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                className="mb-2"
              >
                Choose File
              </AdminButton>
              <p className="text-xs text-admin-gray">
                Max size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-admin-text">Preview:</p>
          <div className="flex items-center gap-4 p-4 bg-admin-bg rounded-lg border border-admin-border">
            <img
              src={preview}
              alt="Preview"
              className="rounded border border-admin-border"
              style={{ width: previewWidth, height: previewHeight, objectFit: 'contain' }}
            />
            <AdminButton
              variant="danger"
              size="sm"
              onClick={removeFile}
            >
              Remove
            </AdminButton>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
    </div>
  );
}