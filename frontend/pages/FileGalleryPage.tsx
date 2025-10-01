

import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DocumentItem } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PaperClipIcon, PlusCircleIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon, InboxIcon } from '@heroicons/react/24/outline';
import FileUploadModal from '../components/shared/FileUploadModal';
import RenameFileModal from '../components/shared/RenameFileModal';
import { useTranslation } from 'react-i18next';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileCard: React.FC<{ file: DocumentItem; onDelete: (id: string) => void; onRename: (file: DocumentItem) => void }> = ({ file, onDelete, onRename }) => {
  const { t } = useTranslation();
  return (
    <Card className="p-4 flex flex-col group" hoverEffect>
      <div className="flex-grow">
        <DocumentIcon className="w-12 h-12 text-swiss-mint mx-auto mb-3" />
        <p className="text-sm font-semibold text-swiss-charcoal text-center truncate" title={file.name}>{file.name}</p>
        <div className="text-xs text-gray-500 text-center mt-1">
          <span>{file.size ? formatBytes(file.size) : ''}</span>
          {file.uploadDate && <span> &middot; {new Date(file.uploadDate).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-center space-x-1">
        <Button variant="ghost" size="xs" title={t('fileGallery.actions.preview')} className="!p-2" onClick={() => alert(t('fileGallery.actions.preview') + ' TBD')}><EyeIcon className="w-4 h-4" /></Button>
        <Button variant="ghost" size="xs" title={t('fileGallery.actions.download')} className="!p-2" onClick={() => alert(t('fileGallery.actions.download') + ' TBD')}><ArrowDownTrayIcon className="w-4 h-4" /></Button>
        <Button variant="ghost" size="xs" title={t('fileGallery.actions.rename')} className="!p-2" onClick={() => onRename(file)}><PencilIcon className="w-4 h-4" /></Button>
        <Button variant="ghost" size="xs" title={t('fileGallery.actions.delete')} className="!p-2 text-swiss-coral" onClick={() => onDelete(file.id)}><TrashIcon className="w-4 h-4" /></Button>
      </div>
    </Card>
  );
};

const FileGalleryPage: React.FC = () => {
  const { t } = useTranslation();
  const { userFiles, deleteUserFile, renameUserFile } = useAppContext();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<DocumentItem | null>(null);

  const handleDelete = (fileId: string) => {
    if (window.confirm(t('fileGallery.confirmDelete'))) {
      deleteUserFile(fileId);
    }
  };

  const handleOpenRenameModal = (file: DocumentItem) => {
    setFileToRename(file);
    setIsRenameModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center mb-4 sm:mb-0">
          <PaperClipIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('sidebar.fileGallery')}
        </h1>
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => setIsUploadModalOpen(true)}>
          {t('fileGallery.uploadButton')}
        </Button>
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
            <FileCard key={file.id} file={file} onDelete={handleDelete} onRename={handleOpenRenameModal} />
          ))}
        </div>
      )}

      <FileUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      <RenameFileModal 
        isOpen={isRenameModalOpen} 
        onClose={() => setIsRenameModalOpen(false)} 
        onRename={renameUserFile} 
        file={fileToRename} 
      />
    </div>
  );
};

export default FileGalleryPage;
