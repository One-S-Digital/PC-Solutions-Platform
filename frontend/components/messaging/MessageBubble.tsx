
import React, { useState } from 'react';
import { Message } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { DocumentIcon, PhotoIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { currentUser } = useAppContext();
  const { updateMessage, deleteMessage } = useMessaging();
  const { t } = useTranslation(['messages', 'common']);
  const isCurrentUserSender = message.senderId === currentUser?.id;
  const isImage = message.messageType === 'IMAGE' && message.fileUrl;
  const isFile = message.messageType === 'FILE' && message.fileUrl;
  const isDeleted = message.content === '[Message deleted]' || message.messageType === 'SYSTEM';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await updateMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(t('messages:confirmDelete', 'Are you sure you want to delete this message?'))) {
      await deleteMessage(message.id);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
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
            <img 
              src={message.fileUrl} 
              alt={message.fileName || 'Image'} 
              className="max-w-full h-auto rounded-lg cursor-pointer"
              onClick={() => window.open(message.fileUrl, '_blank')}
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {message.content && (
              <p className="text-sm whitespace-pre-wrap mt-2">{message.content}</p>
            )}
          </div>
        )}

        {/* File Attachment */}
        {isFile && message.fileUrl && (
          <div className="mb-2">
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={message.fileName}
              className={`flex items-center space-x-2 p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer ${
                isCurrentUserSender 
                  ? 'bg-swiss-mint/20 text-white' 
                  : 'bg-gray-200 text-swiss-charcoal'
              }`}
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
            </a>
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
    </div>
  );
};

export default MessageBubble;
