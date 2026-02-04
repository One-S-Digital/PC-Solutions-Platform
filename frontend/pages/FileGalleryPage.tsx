import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  PaperClipIcon, 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon, 
  TrashIcon,
  InboxIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useUserFiles, UserFile } from '../hooks/useUserFiles';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType?: string, fileName?: string): string => {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
  }
  
  // Fallback to file extension
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp': return '🖼️';
      case 'mp4':
      case 'mov':
      case 'avi': return '🎬';
      case 'mp3':
      case 'wav': return '🎵';
      default: return '📎';
    }
  }
  
  return '📎';
};

interface FileCardProps {
  file: UserFile;
  onPreview: (file: UserFile) => void;
  onDownload: (file: UserFile) => void;
  onDelete: (file: UserFile) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onPreview, onDownload, onDelete }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const fileIcon = getFileIcon(file.mimeType, file.name);

  return (
    <Card className="p-4 flex flex-col group transition-all duration-200" hoverEffect>
      <div className="flex-grow">
        <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center bg-swiss-mint/10 rounded-xl">
          {fileIcon === '📎' ? (
            <DocumentIcon className="w-10 h-10 text-swiss-mint" />
          ) : (
            <span className="text-4xl">{fileIcon}</span>
          )}
        </div>
        <p 
          className="text-sm font-semibold text-swiss-charcoal text-center truncate" 
          title={file.name}
        >
          {file.name}
        </p>
        <div className="text-xs text-gray-500 text-center mt-1 space-y-0.5">
          {file.size > 0 && <span className="block">{formatBytes(file.size)}</span>}
          {file.uploadDate && (
            <span className="block">
              {new Date(file.uploadDate).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
        {file.type && file.type !== 'Other' && (
          <div className="mt-2 flex justify-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-swiss-mint/20 text-swiss-charcoal">
              {file.type}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-center space-x-2">
        <Button 
          variant="ghost" 
          size="xs" 
          title={t('common:fileGallery.actions.preview')} 
          className="!p-2 hover:bg-swiss-mint/10" 
          onClick={() => onPreview(file)}
        >
          <EyeIcon className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="xs" 
          title={t('common:fileGallery.actions.download')} 
          className="!p-2 hover:bg-swiss-mint/10" 
          onClick={() => onDownload(file)}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          title={t('common:fileGallery.actions.delete', 'Delete')}
          className="!p-2 hover:bg-red-50 hover:text-red-600"
          onClick={() => onDelete(file)}
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    {[...Array(5)].map((_, i) => (
      <Card key={i} className="p-4 animate-pulse">
        <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 rounded-xl" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-center space-x-2">
          <div className="w-8 h-8 bg-gray-100 rounded" />
          <div className="w-8 h-8 bg-gray-100 rounded" />
        </div>
      </Card>
    ))}
  </div>
);

const FileGalleryPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { files, loading, error, refetch } = useUserFiles();
  const { authenticatedDownload, request } = useAuthenticatedApi();
  const [previewFile, setPreviewFile] = useState<UserFile | null>(null);

  const handlePreview = (file: UserFile) => {
    setPreviewFile(file);
  };

  const handleDownload = async (file: UserFile) => {
    try {
      await authenticatedDownload(file.url, file.name);
    } catch (err) {
      console.error('Download failed:', err);
      alert(t('common:fileGallery.downloadError', 'Failed to download file. Please try again.'));
    }
  };

  const handleDelete = async (file: UserFile) => {
    const confirmed = window.confirm(
      t(
        'common:fileGallery.confirmDelete',
        'Delete this file permanently? This cannot be undone.',
      ),
    );
    if (!confirmed) return;

    try {
      await request(`/upload/files/${file.id}`, { method: 'DELETE' });
      await refetch();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(t('common:fileGallery.deleteError', 'Failed to delete file. Please try again.'));
    }
  };

  // Get file extension from file name
  const getFileExtension = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <PaperClipIcon className="w-8 h-8 mr-3 text-swiss-mint" />
            {t('dashboard:sidebar.fileGallery')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('common:fileGallery.adminUploadNote', 'View and download your files')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common:refresh', 'Refresh')}
          </Button>
          {files.length > 0 && (
            <span className="text-sm text-gray-500">
              {t('common:fileGallery.fileCount', '{{count}} files', { count: files.length })}
            </span>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                {t('common:errors.loadingFiles', 'Error loading files')}
              </h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                className="mt-3"
              >
                {t('common:tryAgain', 'Try Again')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && files.length === 0 && <LoadingSkeleton />}

      {/* Empty State */}
      {!loading && !error && files.length === 0 && (
        <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">
            {t('common:fileGallery.emptyState.title')}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            {t('common:fileGallery.emptyState.message')}
          </p>
        </Card>
      )}

      {/* Files Grid */}
      {!loading && files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {files.map(file => (
            <FileCard 
              key={file.id} 
              file={file} 
              onPreview={handlePreview}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
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
