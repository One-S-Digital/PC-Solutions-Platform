import React, { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

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
                className="bg-gray-50 rounded-card border border-gray-200 flex items-center justify-center"
                style={{ width: previewWidth, height: previewHeight }}
              >
                <span className="text-gray-600 text-sm">No preview</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-swiss-charcoal">{currentFile.filename}</p>
            <p className="text-xs text-gray-500">Current file</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-card p-6 transition-colors ${
          isDragOver
            ? 'border-swiss-mint bg-swiss-mint/10'
            : 'border-gray-300 hover:border-swiss-mint/50'
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-swiss-mint mb-2"></div>
              <p className="text-sm text-swiss-charcoal">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-card bg-swiss-mint/10">
                <Upload className="w-6 h-6 text-swiss-mint" />
              </div>
              <p className="text-sm text-swiss-charcoal mb-2">
                {isDragOver ? 'Drop file here' : 'Drag and drop a file here, or'}
              </p>
              <button
                type="button"
                onClick={openFileDialog}
                className="btn-secondary mb-2"
              >
                Choose File
              </button>
              <p className="text-xs text-gray-500">
                Max size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-swiss-charcoal">Preview:</p>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <img
              src={preview}
              alt="Preview"
              className="rounded border border-gray-200"
              style={{ width: previewWidth, height: previewHeight, objectFit: 'contain' }}
            />
            <button
              type="button"
              onClick={removeFile}
              className="btn-danger"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </button>
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