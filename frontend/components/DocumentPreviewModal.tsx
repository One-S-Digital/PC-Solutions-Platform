import React from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}) => {
  const { t } = useTranslation(['content', 'common']);
  const { authenticatedDownload } = useAuthenticatedApi();

  if (!isOpen) return null;

  // Debug logging
  console.log('DocumentPreviewModal:', { fileUrl, fileName, fileType });

  const handleDownload = async () => {
    try {
      await authenticatedDownload(fileUrl, fileName);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const renderPreview = () => {
    const normalizedFileType = fileType.toUpperCase();

    // Check if fileUrl is valid
    if (!fileUrl || fileUrl === '#' || fileUrl.startsWith('/hr-procedures') || fileUrl.startsWith('/state-policies')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
          <p className="text-lg mb-4">{t('preview.invalidUrl', 'Invalid file URL')}</p>
          <p className="text-sm mb-2">URL: {fileUrl || 'Not provided'}</p>
          <p className="text-sm mb-6">{t('preview.uploadIssue', 'The document may not have been uploaded correctly')}</p>
        </div>
      );
    }

    // PDF Preview
    if (normalizedFileType === 'PDF') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      );
    }

    // Image Preview
    if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'].includes(normalizedFileType)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // DOCX, XLSX, and other Office formats
    if (['DOCX', 'DOC', 'XLSX', 'XLS', 'PPTX', 'PPT'].includes(normalizedFileType)) {
      // Use Microsoft Office Online Viewer
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      );
    }

    // Text files
    if (['TXT', 'MD', 'JSON', 'XML', 'CSV'].includes(normalizedFileType)) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0 bg-white"
          title={fileName}
        />
      );
    }

    // Default fallback - show download message
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
        <p className="text-lg mb-4">{t('preview.noPreviewAvailable', 'Preview not available for this file type')}</p>
        <p className="text-sm mb-6">{t('preview.downloadToView', 'Please download the file to view it')}</p>
        <Button variant="primary" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
          {t('preview.downloadButton', 'Download File')}
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800 truncate">{fileName}</h2>
            <p className="text-sm text-gray-500">{fileType.toUpperCase()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={ArrowDownTrayIcon}
              onClick={handleDownload}
            >
              {t('common:download', 'Download')}
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t('common:close', 'Close')}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;

