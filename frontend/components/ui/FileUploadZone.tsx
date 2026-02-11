
import React, { useState, DragEvent, ChangeEvent, useRef } from 'react';
import { ArrowUpTrayIcon, PaperClipIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface FileUploadZoneProps {
  onFileUpload?: (file: File) => void; // Called after file selected (for validation)
  onUploadSuccess?: (asset: any) => void; // Called after successful upload to R2
  acceptedMimeTypes?: string; // e.g., "image/*,application/pdf"
  maxFileSizeMB?: number;
  label?: string;
  multiple?: boolean;
  assetKind?: string; // DOCUMENT, AVATAR, LOGO, etc.
  autoUpload?: boolean; // If true, uploads immediately on file select
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  onUploadSuccess,
  acceptedMimeTypes = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.ods",
  maxFileSizeMB = 5,
  label,
  multiple = false,
  assetKind = 'DOCUMENT',
  autoUpload = true,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const displayLabel = label || t('common:fileUploadZone.defaultLabel');
  const { upload } = useAuthenticatedApi();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setValidationError = (message: string | null) => {
    setError(message);
    if (fileInputRef.current) {
      fileInputRef.current.setCustomValidity(message || '');
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setValidationError(null);
    setFileName(null);
    setUploadSuccess(false);

    // Validate file size
    if (maxFileSizeMB && file.size > maxFileSizeMB * 1024 * 1024) {
      setValidationError(
        t('common:fileUploadZone.errors.sizeExceeded', {
          defaultValue: `File size exceeds ${maxFileSizeMB}MB.`,
          max: maxFileSizeMB,
        })
      );
      return;
    }

    // Validate MIME type
    if (acceptedMimeTypes) {
      const acceptedTypesArray = acceptedMimeTypes.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      
      const isAccepted = acceptedTypesArray.some(acceptedType => {
        if (acceptedType.endsWith('/*')) { // Wildcard like image/*
          return fileType.startsWith(acceptedType.slice(0, -2));
        }
        if (acceptedType.startsWith('.')) { // Extension like .pdf
            return fileExtension === acceptedType;
        }
        return fileType === acceptedType; // Exact MIME type
      });

      if (!isAccepted) {
        setValidationError(
          t('common:fileUploadZone.errors.invalidType', {
            defaultValue: `Invalid file type. Accepted: ${acceptedMimeTypes.replace(/\/\*/g, '')}`,
            types: acceptedMimeTypes.replace(/\/\*/g, ''),
          })
        );
        return;
      }
    }
    
    setFileName(file.name);
    
    // Call the onFileUpload callback if provided (for validation/preview)
    if (onFileUpload) {
      onFileUpload(file);
    }

    // Auto-upload if enabled
    if (autoUpload) {
      setIsUploading(true);
      try {
        const response = await upload('/upload/file', file, { assetKind });
        
        if (response.success && response.asset) {
          setUploadSuccess(true);
          if (onUploadSuccess) {
            onUploadSuccess(response.asset);
          }
        } else {
          setValidationError(
            t('common:fileUploadZone.errors.uploadFailed', {
              defaultValue: 'Upload failed. Please try again.',
            }),
          );
        }
      } catch (err: any) {
        setValidationError(
          err.message ||
            t('common:fileUploadZone.errors.uploadFailed', {
              defaultValue: 'Upload failed. Please try again.',
            }),
        );
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]); // Handle only the first file for simplicity
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  }

  return (
    <div>
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
          dragging ? 'border-swiss-mint scale-105 bg-swiss-mint/5' : 
          uploadSuccess ? 'border-green-500 bg-green-50' :
          error ? 'border-red-500 bg-red-50' :
          'border-gray-300 border-dashed'
        } rounded-md transition-all duration-200 ease-in-out ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!isUploading ? openFileDialog : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (!isUploading && (e.key === 'Enter' || e.key === ' ')) openFileDialog();}}
        aria-label={displayLabel}
      >
        <div className="space-y-1 text-center">
          {isUploading ? (
            <>
              <div className="mx-auto h-10 w-10 border-4 border-swiss-mint border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : uploadSuccess ? (
            <>
              <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
              <p className="text-sm text-green-600">Upload successful!</p>
              {fileName && (
                <div className="text-xs text-gray-600 flex items-center justify-center pt-2">
                  <PaperClipIcon className="h-4 w-4 mr-1" />
                  {fileName}
                </div>
              )}
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className={`mx-auto h-10 w-10 ${dragging ? 'text-swiss-mint' : 'text-gray-400'}`} />
              <div className="flex text-sm text-gray-600">
                <span
                  className="relative cursor-pointer bg-transparent rounded-md font-medium text-swiss-mint hover:text-opacity-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-swiss-mint"
                >
                  <span>{displayLabel}</span>
                </span>
                <p className="pl-1 text-gray-500">{t("fileUploadZone.dragAndDrop")}</p>
              </div>
              <p className="text-xs text-gray-500">
                {acceptedMimeTypes.replace(/\/\*/g, '').split(',').join(', ').toUpperCase()}. Max {maxFileSizeMB}MB.
              </p>
            </>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={acceptedMimeTypes}
        multiple={multiple}
        onChange={handleChange}
        aria-invalid={!!error}
      />
      {error && (
        <div className="mt-2 flex items-center text-sm text-swiss-coral" role="alert">
          <XCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
