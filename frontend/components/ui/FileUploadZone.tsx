
import React, { useState, DragEvent, ChangeEvent, useRef } from 'react';
import { ArrowUpTrayIcon, PaperClipIcon } from '@heroicons/react/24/outline';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  acceptedMimeTypes?: string; // e.g., "image/*,application/pdf"
  maxFileSizeMB?: number;
  label?: string;
  multiple?: boolean; // For multiple file uploads (not fully handled in this basic version)
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  acceptedMimeTypes = "image/*,application/pdf,.doc,.docx,.xls,.xlsx",
  maxFileSizeMB = 5,
  label = "Upload a file",
  multiple = false,
}) => {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setFileName(null);

    if (maxFileSizeMB && file.size > maxFileSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxFileSizeMB}MB.`);
      return;
    }

    // Basic MIME type check (can be more robust)
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
        setError(`Invalid file type. Accepted: ${acceptedMimeTypes.replace(/\/\*/g, '')}`);
        return;
      }
    }
    
    setFileName(file.name);
    onFileUpload(file);
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
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${dragging ? 'border-swiss-mint scale-105 bg-swiss-mint/5' : 'border-gray-300 border-dashed'} rounded-md transition-all duration-200 ease-in-out`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog} // Allow click to open file dialog
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFileDialog();}}
        aria-label={label}
      >
        <div className="space-y-1 text-center">
          <ArrowUpTrayIcon className={`mx-auto h-10 w-10 ${dragging ? 'text-swiss-mint' : 'text-gray-400'}`} />
          <div className="flex text-sm text-gray-600">
            <span
              className="relative cursor-pointer bg-transparent rounded-md font-medium text-swiss-mint hover:text-opacity-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-swiss-mint"
            >
              <span>{label}</span>
            </span>
            <p className="pl-1 text-gray-500">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            {acceptedMimeTypes.replace(/\/\*/g, '').split(',').join(', ').toUpperCase()}. Max {maxFileSizeMB}MB.
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={acceptedMimeTypes}
        multiple={multiple}
        onChange={handleChange}
      />
      {fileName && !error && (
        <p className="mt-2 text-sm text-green-600 flex items-center">
          <PaperClipIcon className="w-4 h-4 mr-1.5" />
          Selected: {fileName}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-swiss-coral">{error}</p>}
    </div>
  );
};

export default FileUploadZone;
