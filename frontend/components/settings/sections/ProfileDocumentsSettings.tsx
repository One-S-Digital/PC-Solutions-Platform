import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserRole } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../../contexts/NotificationContext';
import {
  DocumentIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

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

interface ProfileDocumentsSettingsProps {
  userRole: UserRole;
}

const DOCUMENT_TYPES = [
  { value: 'CATALOG' },
  { value: 'COMPANY_PROFILE' },
  { value: 'BROCHURE' },
  { value: 'PRICE_LIST' },
];

const getDocumentIcon = (mimeType?: string) => {
  if (!mimeType) return DocumentIcon;
  if (mimeType.includes('pdf')) return DocumentTextIcon;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return PresentationChartBarIcon;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return TableCellsIcon;
  return DocumentIcon;
};

const formatFileSize = (t: (key: string, options?: any) => string, bytes?: number): string => {
  if (!bytes) return t('settings:profileDocuments.unknownSize');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ProfileDocumentsSettings: React.FC<ProfileDocumentsSettingsProps> = ({ userRole }) => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { request, upload, authenticatedDownload } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingProgress, setUploadingProgress] = useState(0);
  const [selectedDocType, setSelectedDocType] = useState('CATALOG');
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if user is allowed to use this component
  const isAllowed = userRole === UserRole.PRODUCT_SUPPLIER || userRole === UserRole.SERVICE_PROVIDER;

  const fetchDocuments = useCallback(async () => {
    if (!isAllowed) return;
    
    try {
      setIsLoading(true);
      const response = await request<ProfileDocument[]>('/organization-documents');
      if (response.success && Array.isArray(response.data)) {
        setDocuments(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
      // Don't show error notification on initial load if there are no documents
    } finally {
      setIsLoading(false);
    }
  }, [request, isAllowed]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (!allowedTypes.includes(file.type)) {
      addNotification({
        title: t('settings:profileDocuments.invalidFileType', 'Invalid file type'),
        message: t('settings:profileDocuments.allowedTypes', 'Please upload a PDF, Word, Excel, or PowerPoint file.'),
        type: 'error',
      });
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      addNotification({
        title: t('settings:profileDocuments.fileTooLarge', 'File too large'),
        message: t('settings:profileDocuments.maxFileSize', 'Maximum file size is 50MB.'),
        type: 'error',
      });
      return;
    }

    setIsUploading(true);
    setUploadingProgress(10);

    try {
      // Step 1: Upload the file
      setUploadingProgress(30);
      const uploadResponse = await upload('/upload/file', file, { assetKind: 'COMPANY_PROFILE_DOC' });

      if (!uploadResponse.success || !uploadResponse.asset) {
        throw new Error(uploadResponse.message || 'Upload failed');
      }

      setUploadingProgress(70);

      // Step 2: Create the document record
      const createResponse = await request<ProfileDocument>('/organization-documents', {
        method: 'POST',
        body: JSON.stringify({
          assetId: uploadResponse.asset.id,
          documentType: selectedDocType,
          title: docTitle || file.name,
          description: docDescription || undefined,
        }),
      });

      setUploadingProgress(100);

      if (createResponse.success && createResponse.data) {
        setDocuments(prev => [...prev, createResponse.data!]);
        addNotification({
          title: t('settings:profileDocuments.uploadSuccess', 'Document uploaded'),
          message: t('settings:profileDocuments.uploadSuccessMessage', 'Your document has been uploaded successfully.'),
          type: 'success',
        });
        
        // Reset form
        setDocTitle('');
        setDocDescription('');
        setSelectedDocType('CATALOG');
      } else {
        throw new Error(createResponse.message || 'Failed to create document record');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      addNotification({
        title: t('settings:profileDocuments.uploadFailed', 'Upload failed'),
        message: error.message || t('settings:profileDocuments.uploadFailedMessage', 'Failed to upload document. Please try again.'),
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadingProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm(t('settings:profileDocuments.confirmDelete', 'Are you sure you want to delete this document?'))) {
      return;
    }

    setDeletingId(documentId);

    try {
      const response = await request<{ success: boolean }>(`/organization-documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        addNotification({
          title: t('settings:profileDocuments.deleteSuccess', 'Document deleted'),
          message: t('settings:profileDocuments.deleteSuccessMessage', 'The document has been deleted successfully.'),
          type: 'success',
        });
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      addNotification({
        title: t('settings:profileDocuments.deleteFailed', 'Delete failed'),
        message: error.message || t('settings:profileDocuments.deleteFailedMessage', 'Failed to delete document. Please try again.'),
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: ProfileDocument) => {
    if (!doc.asset?.publicUrl) {
      addNotification({
        title: t('common:errors.downloadFailed', 'Download failed'),
        message: t('settings:profileDocuments.noFileUrl', 'Document URL not available.'),
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
        message: error.message || t('settings:profileDocuments.downloadFailedMessage', 'Failed to download document.'),
        type: 'error',
      });
    }
  };

  const handlePreview = (doc: ProfileDocument) => {
    if (doc.asset?.publicUrl) {
      setPreviewUrl(doc.asset.publicUrl);
    }
  };

  if (!isAllowed) {
    return null;
  }

  return (
    <SettingsSectionWrapper 
      title={t('settings:profileDocuments.title')} 
      icon={DocumentIcon}
    >
      <div className="space-y-6">
        {/* Description */}
        <p className="text-sm text-gray-600">
          {userRole === UserRole.PRODUCT_SUPPLIER
            ? t('settings:profileDocuments.supplierDescription', 'Upload product catalogs, price lists, or company brochures that will be visible on your public profile.')
            : t('settings:profileDocuments.serviceProviderDescription', 'Upload service brochures, company profiles, or capability documents that will be visible on your public profile.')
          }
        </p>

        {/* Upload Section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">
            {t('settings:profileDocuments.uploadNew')}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profileDocuments.documentType')}
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-swiss-mint focus:ring-swiss-mint text-sm"
                disabled={isUploading}
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {t(`settings:profileDocuments.types.${type.value.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profileDocuments.documentTitle')}
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder={t('settings:profileDocuments.titlePlaceholder')}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-swiss-mint focus:ring-swiss-mint text-sm"
                disabled={isUploading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:profileDocuments.description')}
            </label>
            <textarea
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder={t('settings:profileDocuments.descriptionPlaceholder')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-swiss-mint focus:ring-swiss-mint text-sm"
              rows={2}
              disabled={isUploading}
            />
          </div>

          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-swiss-mint hover:bg-swiss-mint/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {t('settings:profileDocuments.uploading')} ({uploadingProgress}%)
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="-ml-1 mr-2 h-4 w-4" />
                  {t('settings:profileDocuments.selectFile')}
                </>
              )}
            </button>
            
            <p className="mt-2 text-xs text-gray-500">
              {t('settings:profileDocuments.allowedFormats')}
            </p>
          </div>
        </div>

        {/* Documents List */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('settings:profileDocuments.uploadedDocuments')}
          </h4>
          
          {isLoading ? (
            <div className="text-center py-8">
              <ArrowPathIcon className="animate-spin h-8 w-8 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {t('common:loading')}
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <DocumentIcon className="h-12 w-12 mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                {t('settings:profileDocuments.noDocuments')}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t('settings:profileDocuments.uploadHint')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {documents.map((doc) => {
                const IconComponent = getDocumentIcon(doc.asset?.mimeType);
                const docTypeKey = `settings:profileDocuments.types.${doc.documentType.toLowerCase()}`;
                
                return (
                  <li key={doc.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <IconComponent className="h-8 w-8 text-swiss-mint" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.title || doc.asset?.filename || t('settings:profileDocuments.untitledDocument')}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {t(docTypeKey)}
                            </span>
                            <span>{formatFileSize(t, doc.asset?.size)}</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString(i18n.language || 'en')}</span>
                          </div>
                          {doc.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {doc.asset?.mimeType?.includes('pdf') && (
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-2 text-gray-400 hover:text-swiss-mint transition-colors"
                            title={t('settings:profileDocuments.preview')}
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-gray-400 hover:text-swiss-mint transition-colors"
                          title={t('settings:profileDocuments.download')}
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title={t('settings:profileDocuments.delete')}
                        >
                          {deletingId === doc.id ? (
                            <ArrowPathIcon className="animate-spin h-5 w-5" />
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

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
              title={t('settings:profileDocuments.previewIframeTitle')}
            />
          </div>
        </div>
      )}
    </SettingsSectionWrapper>
  );
};

export default ProfileDocumentsSettings;
