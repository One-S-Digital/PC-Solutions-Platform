import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DocumentIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../contexts/NotificationContext';

interface ProfileDocument {
  id: string;
  organizationId: string;
  assetId: string;
  documentType: string;
  title?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    filename: string;
    publicUrl: string;
    mimeType?: string;
    size?: number;
  };
}

interface OrganizationDocumentsListProps {
  organizationId: string;
}

const getDocumentIcon = (mimeType?: string) => {
  if (!mimeType) return DocumentIcon;
  if (mimeType.includes('pdf')) return DocumentTextIcon;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return PresentationChartBarIcon;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return TableCellsIcon;
  return DocumentIcon;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const OrganizationDocumentsList: React.FC<OrganizationDocumentsListProps> = ({ organizationId }) => {
  const { t } = useTranslation(['profile', 'common']);
  const { request, authenticatedDownload } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await request<ProfileDocument[]>(
          `/organization-documents/public/${organizationId}`
        );
        if (response.success && Array.isArray(response.data)) {
          setDocuments(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (organizationId) {
      fetchDocuments();
    }
  }, [organizationId, request]);

  const handleDownload = async (doc: ProfileDocument) => {
    if (!doc.asset?.publicUrl) {
      addNotification({
        title: t('common:errors.downloadFailed', 'Download failed'),
        message: t('profile:documents.noFileUrl', 'Document URL not available.'),
        type: 'error',
      });
      return;
    }

    try {
      await authenticatedDownload(doc.asset.publicUrl, doc.asset.filename || 'document');
    } catch (error: any) {
      console.error('Download failed:', error);
      addNotification({
        title: t('common:errors.downloadFailed', 'Download failed'),
        message: error.message || t('profile:documents.downloadFailedMessage', 'Failed to download document.'),
        type: 'error',
      });
    }
  };

  // Don't render anything if loading or no documents
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="animate-spin h-6 w-6 text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">{t('common:loading', 'Loading...')}</span>
        </div>
      </Card>
    );
  }

  if (documents.length === 0) {
    return null; // Don't show the section if there are no documents
  }

  return (
    <>
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center gap-2">
          <DocumentIcon className="w-5 h-5 text-swiss-mint" />
          {t('profile:documents.title', 'Documents & Resources')}
        </h2>
        
        <div className="grid gap-3">
          {documents.map((doc) => {
            const IconComponent = getDocumentIcon(doc.asset?.mimeType);
            const docTypeKey = `profile:documents.types.${doc.documentType.toLowerCase()}`;
            
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-swiss-mint/50 transition-colors"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 p-2 bg-swiss-mint/10 rounded-lg">
                    <IconComponent className="h-6 w-6 text-swiss-mint" />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.title || doc.asset?.filename || t('profile:documents.untitledDocument', 'Untitled document')}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 space-x-2 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {t(docTypeKey, doc.documentType)}
                      </span>
                      {doc.asset?.size && (
                        <span>{formatFileSize(doc.asset.size)}</span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {doc.asset?.mimeType?.includes('pdf') && (
                    <button
                      onClick={() => setPreviewUrl(doc.asset!.publicUrl)}
                      className="p-2 text-gray-400 hover:text-swiss-mint transition-colors rounded-lg hover:bg-gray-50"
                      title={t('profile:documents.preview', 'Preview')}
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-gray-400 hover:text-swiss-mint transition-colors rounded-lg hover:bg-gray-50"
                    title={t('profile:documents.download', 'Download')}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            </button>
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-lg"
              title={t('profile:documents.previewIframeTitle', 'Document preview')}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default OrganizationDocumentsList;
