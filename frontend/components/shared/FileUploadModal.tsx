import React, { useState, DragEvent } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import Button from '../ui/Button';
import { XMarkIcon, ArrowUpTrayIcon, PaperClipIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetKind?: string; // DOCUMENT, AVATAR, LOGO, etc.
  onUploadComplete?: (assets: any[]) => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  assetKind = 'DOCUMENT',
  onUploadComplete 
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { addUserFile } = useAppContext();
  const { upload } = useAuthenticatedApi();
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFilesToUpload(Array.from(event.target.files));
      setUploadError(null);
    }
  };
  
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files) {
        setFilesToUpload(Array.from(event.dataTransfer.files));
        setUploadError(null);
    }
  };
  
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleUpload = async () => {
    if (filesToUpload.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    const uploadedAssets: any[] = [];

    try {
      // Upload files one by one
      for (const file of filesToUpload) {
        try {
          const response = await upload('/upload/file', file, { assetKind });
          
          if (response.success && response.asset) {
            uploadedAssets.push(response.asset);
            // Also add to context for backward compatibility
            addUserFile(file);
          }
        } catch (error: any) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }

      setUploadedFiles(uploadedAssets);
      
      // Call completion callback if provided
      if (onUploadComplete) {
        onUploadComplete(uploadedAssets);
      }

      // Success - close modal after a brief delay to show success
      setTimeout(() => {
        setFilesToUpload([]);
        setUploadedFiles([]);
        onClose();
      }, 1000);

    } catch (error: any) {
      setUploadError(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('fileUploadModal.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
          <div 
            onDrop={handleDrop} 
            onDragOver={handleDragOver}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"
          >
            <div className="space-y-1 text-center">
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-swiss-mint hover:text-swiss-teal">
                  <span>{t('fileUploadModal.uploadFile')}</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                </label>
                <p className="pl-1">{t('fileUploadModal.dragAndDrop')}</p>
              </div>
              <p className="text-xs text-gray-500">{t('fileUploadModal.fileTypes')}</p>
            </div>
          </div>
          {filesToUpload.length > 0 && (
            <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {uploadedFiles.length > 0 ? t('fileUploadModal.uploadedFiles') : t('fileUploadModal.filesToUpload')}
                </h3>
                <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-200">
                    {filesToUpload.map((file, index) => (
                        <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                            <div className="w-0 flex-1 flex items-center">
                                {uploadedFiles.some(f => f.filename === file.name) ? (
                                  <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" />
                                ) : (
                                  <PaperClipIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                                )}
                                <span className="ml-2 flex-1 w-0 truncate">{file.name}</span>
                            </div>
                            {uploadedFiles.some(f => f.filename === file.name) && (
                              <span className="text-xs text-green-600">✓ Uploaded</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
          )}
          {uploadError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
          <Button variant="light" onClick={onClose} disabled={isUploading}>{t('buttons.cancel')}</Button>
          <Button variant="primary" onClick={handleUpload} disabled={filesToUpload.length === 0 || isUploading}>
            {isUploading ? t('fileUploadModal.uploading') : t('fileUploadModal.uploadButton', { count: filesToUpload.length })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
