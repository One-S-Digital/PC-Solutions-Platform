
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { DocumentIcon, PhotoIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { apiService } from '../../services/api';
import DocumentPreviewModal from '../DocumentPreviewModal';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { currentUser } = useAppContext();
  const { updateMessage, deleteMessage } = useMessaging();
  const { t } = useTranslation(['messages', 'common']);
  const { getToken } = useAuth();
  const { authenticatedDownload } = useAuthenticatedApi();
  const isCurrentUserSender = message.senderId === currentUser?.id;
  const isImage = message.messageType === 'IMAGE' && message.fileUrl;
  const isFile = message.messageType === 'FILE' && message.fileUrl;
  const isDeleted = message.content === '[Message deleted]';
  const isSystem = message.messageType === 'SYSTEM';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imageFetchedRef = useRef(false);
  const [showPreview, setShowPreview] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      try {
        await updateMessage(message.id, editContent.trim());
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update message:', error);
        alert(t('common:errors.updateFailed', 'Failed to update message. Please try again.'));
        // Keep edit mode open so user can retry
        return;
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('messages:confirmDelete', 'Are you sure you want to delete this message?'))) {
      try {
        await deleteMessage(message.id);
      } catch (error) {
        console.error('Failed to delete message:', error);
        alert(t('common:errors.deleteFailed', 'Failed to delete message. Please try again.'));
      }
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Reset fetch flag when URL changes
  useEffect(() => {
    imageFetchedRef.current = false;
  }, [message.fileUrl]);

  // Cleanup blob URL when it changes
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        window.URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [imageBlobUrl]);

  // Fetch image with authentication and create blob URL
  useEffect(() => {
    if (isImage && message.fileUrl && !imageFetchedRef.current) {
      imageFetchedRef.current = true;
      setImageLoading(true);
      setImageError(false);

      const fetchAuthenticatedImage = async () => {
        try {
          const token = await getToken();
          if (!token) {
            setImageError(true);
            setImageLoading(false);
            return;
          }

          // Extract the storage key from the URL
          let downloadUrl = message.fileUrl;
          const apiBaseUrl = apiService.apiBaseUrl; // e.g., "http://localhost:3000/api"
          
          if (downloadUrl.startsWith('/api/upload/download/')) {
            // Already a secure URL (relative path like /api/upload/download/...)
            // Extract the storage key (everything after /api/upload/download/)
            const storageKey = downloadUrl.replace('/api/upload/download/', '');
            downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
          } else if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
            // Full URL - extract storage key
            try {
              const url = new URL(downloadUrl);
              // Check if it's already a download URL
              if (url.pathname.startsWith('/api/upload/download/')) {
                const storageKey = url.pathname.replace('/api/upload/download/', '');
                downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
              } else {
                // Extract storage key from pathname
                const storageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
                downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
              }
            } catch {
              // If URL parsing fails, try to extract from path
              const pathMatch = downloadUrl.match(/\/upload\/download\/(.+)$/);
              if (pathMatch) {
                downloadUrl = `${apiBaseUrl}/upload/download/${pathMatch[1]}`;
              } else {
                // Fallback: assume it's a storage key
                downloadUrl = `${apiBaseUrl}/upload/download/${downloadUrl}`;
              }
            }
          } else {
            // Assume it's a storage key (e.g., "messages/...")
            downloadUrl = `${apiBaseUrl}/upload/download/${downloadUrl}`;
          }

          const response = await fetch(downloadUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`);
          }

          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          setImageBlobUrl(blobUrl);
          setImageLoading(false);
        } catch (error) {
          console.error('Failed to load authenticated image:', error);
          setImageError(true);
          setImageLoading(false);
        }
      };

      fetchAuthenticatedImage();
    }
  }, [isImage, message.fileUrl, getToken]);

  const handleFileDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!message.fileUrl || !message.fileName) return;

    try {
      await authenticatedDownload(message.fileUrl, message.fileName);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert(t('common:errors.downloadFailed', 'Failed to download file. Please try again.'));
    }
  };

  const handleImageClick = () => {
    if (imageBlobUrl) {
      window.open(imageBlobUrl, '_blank');
    } else if (message.fileUrl) {
      // Fallback: try to open the URL (might not work if auth required)
      window.open(message.fileUrl, '_blank');
    }
  };

  if (isDeleted) {
    return (
      <div className={`flex mb-3 ${isCurrentUserSender ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl shadow-soft ${
          isCurrentUserSender 
            ? 'bg-gray-300 text-gray-500 rounded-br-none' 
            : 'bg-gray-200 text-gray-500 rounded-bl-none'
        }`}>
          <p className="text-sm italic">{t('messages:messageDeleted', 'Message deleted')}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex mb-3 ${isCurrentUserSender ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => isCurrentUserSender && !isEditing && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocus={() => isCurrentUserSender && !isEditing && setShowActions(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setShowActions(false)}
      tabIndex={isCurrentUserSender ? 0 : -1}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl shadow-soft relative ${
        isCurrentUserSender 
          ? 'bg-swiss-mint text-white rounded-br-none' 
          : 'bg-gray-100 text-swiss-charcoal rounded-bl-none'
      }`}>
        {isCurrentUserSender && showActions && !isEditing && (
          <div className="absolute -top-8 right-0 flex space-x-1 bg-white rounded-lg shadow-lg p-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-gray-100 rounded"
              title={t('messages:editMessage', 'Edit message')}
            >
              <PencilIcon className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-gray-100 rounded"
              title={t('messages:deleteMessage', 'Delete message')}
            >
              <TrashIcon className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
        {!isCurrentUserSender && (
          <p className="text-xs font-semibold mb-0.5 text-swiss-teal">{message.senderName}</p>
        )}
        
        {/* Image Preview */}
        {isImage && message.fileUrl && (
          <div className="mb-2">
            {imageLoading && (
              <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-500">{t('common:loading', 'Loading...')}</p>
              </div>
            )}
            {imageError && (
              <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-red-500">{t('common:errors.loadFailed', 'Failed to load image')}</p>
              </div>
            )}
            {imageBlobUrl && !imageLoading && !imageError && (
              <img 
                src={imageBlobUrl} 
                alt={message.fileName || 'Image'} 
                className="max-w-full h-auto rounded-lg cursor-pointer"
                onClick={handleImageClick}
                onError={(e) => {
                  console.error('Image display error');
                  (e.target as HTMLImageElement).style.display = 'none';
                  setImageError(true);
                }}
              />
            )}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap mt-2">{message.content}</p>
            )}
          </div>
        )}

        {/* File Attachment */}
        {isFile && message.fileUrl && (
          <div className="mb-2">
            <div className={`flex items-center space-x-2 p-2 rounded-lg ${
              isCurrentUserSender 
                ? 'bg-swiss-mint/20 text-white' 
                : 'bg-gray-200 text-swiss-charcoal'
            }`}>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center space-x-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer"
                title={t('common:previewLabel', 'Preview')}
              >
                <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
                  {message.fileSize && (
                    <p className={`text-xs ${isCurrentUserSender ? 'text-swiss-mint/70' : 'text-gray-500'}`}>
                      {formatFileSize(message.fileSize)}
                    </p>
                  )}
                </div>
              </button>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileDownload(e);
                  }}
                  className={`p-1.5 rounded hover:opacity-80 transition-opacity ${
                    isCurrentUserSender 
                      ? 'hover:bg-swiss-mint/30 text-white' 
                      : 'hover:bg-gray-300 text-swiss-charcoal'
                  }`}
                  title={t('common:download', 'Download')}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Only show content if it's not empty and not JSON metadata */}
            {message.content && message.content.trim() && !message.content.startsWith('{') && (
              <p className="text-sm whitespace-pre-wrap mt-2">{message.content}</p>
            )}
          </div>
        )}

        {/* Text Content (for TEXT messages or captions) */}
        {/* Don't show content if it's JSON metadata or empty */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 rounded border border-gray-300 text-swiss-charcoal text-sm resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex space-x-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="p-1 hover:bg-white/20 rounded"
                title={t('common:buttons.cancel', 'Cancel')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleEdit}
                className="p-1 hover:bg-white/20 rounded"
                title={t('common:buttons.save', 'Save')}
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (!isImage && !isFile) && message.content && message.content.trim() && !message.content.startsWith('{') && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        <p className={`text-xs mt-1 ${isCurrentUserSender ? 'text-swiss-mint/70 text-right' : 'text-gray-400 text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Document Preview Modal */}
      {isFile && message.fileUrl && (
        <DocumentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          fileUrl={message.fileUrl}
          fileName={message.fileName || 'Document'}
          fileType={message.mimeType || message.fileName?.split('.').pop()?.toUpperCase() || 'PDF'}
        />
      )}
    </div>
  );
};

export default MessageBubble;
