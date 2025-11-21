

import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DocumentItem } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PaperClipIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, InboxIcon } from '@heroicons/react/24/outline';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileCard: React.FC<{ file: DocumentItem; onPreview: (file: DocumentItem) => void; onDownload: (file: DocumentItem) => void }> = ({ file, onPreview, onDownload }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  return (
    <Card className="p-4 flex flex-col group" hoverEffect>
      <div className="flex-grow">
        <DocumentIcon className="w-12 h-12 text-swiss-mint mx-auto mb-3" />
        <p className="text-sm font-semibold text-swiss-charcoal text-center truncate" title={file.name}>{file.name}</p>
        <div className="text-xs text-gray-500 text-center mt-1">
          <span>{file.size ? formatBytes(file.size) : ''}</span>
          {file.uploadDate && <span> &middot; {new Date(file.uploadDate).toLocaleDateString(i18n.language)}</span>}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-center space-x-2">
        <Button variant="ghost" size="xs" title={t('fileGallery.actions.preview')} className="!p-2" onClick={() => onPreview(file)}><EyeIcon className="w-4 h-4" /></Button>
        <Button variant="ghost" size="xs" title={t('fileGallery.actions.download')} className="!p-2" onClick={() => onDownload(file)}><ArrowDownTrayIcon className="w-4 h-4" /></Button>
      </div>
    </Card>
  );
};

const FileGalleryPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { userFiles } = useAppContext();
  const { authenticatedDownload } = useAuthenticatedApi();
  const [previewFile, setPreviewFile] = useState<DocumentItem | null>(null);

  const handlePreview = (file: DocumentItem) => {
    setPreviewFile(file);
  };

  const handleDownload = async (file: DocumentItem) => {
    try {
      await authenticatedDownload(file.url, file.name);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // Get file extension from file name
  const getFileExtension = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'PDF';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center mb-4 sm:mb-0">
          <PaperClipIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('sidebar.fileGallery')}
        </h1>
        <div className="text-sm text-gray-500 italic">
          {t('fileGallery.adminUploadNote', 'Files are uploaded by administrators')}
        </div>
      </div>

      {userFiles.length === 0 ? (
        <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('fileGallery.emptyState.title')}</h2>
          <p className="text-gray-500">{t('fileGallery.emptyState.message')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {userFiles.map(file => (
            <FileCard 
              key={file.id} 
              file={file} 
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {previewFile && (
        <DocumentPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={getFileExtension(previewFile.name)}
        />
      )}
    </div>
  );
};

export default FileGalleryPage;
