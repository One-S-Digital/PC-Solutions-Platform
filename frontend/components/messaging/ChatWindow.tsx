import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMessaging } from '../../contexts/MessagingContext';
import { useAppContext } from '../../contexts/AppContext';
import MessageBubble from './MessageBubble';
import Button from '../ui/Button';
import { PaperAirplaneIcon, UserCircleIcon, PaperClipIcon, FaceSmileIcon, UserGroupIcon, XMarkIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '@clerk/clerk-react';
import { useMessagingSocket } from '../../hooks/useMessagingSocket';

const ChatWindow: React.FC = () => {
  const { t } = useTranslation(['messages', 'common', 'dashboard']);
  const { 
    activeConversationId, 
    messagesByConversation, 
    sendMessage, 
    conversations, 
    hasMoreMessages, 
    loadMoreMessages,
    loadMessagesForConversation,
    updateMessage: updateMessageInContext,
    deleteMessage: deleteMessageInContext,
  } = useMessaging();
  const { currentUser } = useAppContext();
  const { getToken } = useAuth();
  const { upload } = useAuthenticatedApi();
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [pendingFile, setPendingFile] = useState<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    isImage: boolean;
  } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const rawMessages = activeConversationId ? messagesByConversation[activeConversationId] || [] : [];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Deduplicate messages by ID to prevent React key warnings
  const messages = useMemo(() => {
    const seen = new Set<string>();
    return rawMessages.filter(msg => {
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  }, [rawMessages]);

  // WebSocket integration for real-time updates and typing indicators
  const { sendTypingStart, sendTypingStop } = useMessagingSocket({
    conversationId: activeConversationId,
    userId: currentUser?.id || '',
    userName: currentUser?.name || '',
    onNewMessage: async (message: any) => {
      // Transform and refresh messages when new message arrives via WebSocket
      if (activeConversationId) {
        loadMessagesForConversation(activeConversationId);
      }
    },
    onMessageUpdate: async (message: any) => {
      // Refresh messages when message is updated via WebSocket
      if (activeConversationId) {
        loadMessagesForConversation(activeConversationId);
      }
    },
    onMessageDelete: (messageId: string) => {
      // Refresh messages when message is deleted via WebSocket
      if (activeConversationId) {
        loadMessagesForConversation(activeConversationId);
      }
    },
    onUserTyping: (data: { userId: string; userName: string; isTyping: boolean }) => {
      // Don't show typing indicator for the current user
      if (data.userId === currentUser?.id) return;
      
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (data.isTyping) {
          updated[data.userId] = data.userName;
        } else {
          delete updated[data.userId];
        }
        return updated;
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Track if user is near bottom to avoid disrupting scroll when loading older messages
  const isNearBottomRef = useRef(true);

  // Update isNearBottom on scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScrollPosition = () => {
      const threshold = 100;
      isNearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    };
    container.addEventListener('scroll', handleScrollPosition);
    return () => container.removeEventListener('scroll', handleScrollPosition);
  }, []);

  useEffect(() => {
    // Only scroll to bottom if user is near bottom (for new messages)
    // Don't scroll when loading older messages (infinite scroll)
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversationId || isLoadingMore || !hasMoreMessages[activeConversationId]) return;

    // Load more when scrolled to top (within 100px)
    if (container.scrollTop < 100) {
      setIsLoadingMore(true);
      const previousScrollHeight = container.scrollHeight;
      loadMoreMessages(activeConversationId).then(() => {
        // Maintain scroll position after loading
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight;
          }
          setIsLoadingMore(false);
        }, 100);
      }).catch(() => {
        setIsLoadingMore(false);
      });
    }
  }, [activeConversationId, hasMoreMessages, loadMoreMessages, isLoadingMore]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => {
      const updated = prev + emojiData.emoji;
      // Trigger typing indicator when emoji is added
      if (updated.trim().length > 0) {
        sendTypingStart();
      }
      return updated;
    });
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      alert(t('messages:errors.fileTooLarge', 'File size exceeds 50MB limit'));
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Determine file type and appropriate assetKind
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isPresentation = file.type.includes('powerpoint') || file.type.includes('presentation');
      const isCSV = file.type === 'text/csv' || file.type === 'application/csv';
      
      // Route to appropriate asset kind based on file type
      let assetKind: string;
      if (isImage) {
        assetKind = 'COVER_IMAGE'; // Images (JPEG, PNG, WEBP)
      } else if (isVideo || isPresentation) {
        assetKind = 'ELEARNING'; // Videos (MP4, MOV, AVI, WebM) & Presentations (PPT, PPTX)
      } else if (isCSV) {
        assetKind = 'CATALOG_CSV'; // CSV files
      } else {
        assetKind = 'DOCUMENT'; // Documents (PDF, Word)
      }

      // Upload file with conversationId to organize files by conversation
      const uploadResponse = await upload('/upload/file', file, { 
        assetKind,
        conversationId: activeConversationId 
      });
      
      if (!uploadResponse.success || !uploadResponse.asset) {
        throw new Error('File upload failed');
      }

      const asset = uploadResponse.asset;
      const fileUrl = asset.publicUrl || asset.url;
      
      // Store the file as pending instead of sending immediately
      setPendingFile({
        fileName: asset.filename || file.name,
        fileSize: asset.size || file.size,
        mimeType: asset.mimeType || asset.contentType || file.type,
        fileUrl: fileUrl,
        isImage: isImage,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      console.error('Failed to upload file:', error);
      alert(`${errorMessage}. Please try again.`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePendingFile = () => {
    setPendingFile(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId) return;
    
    const messageText = newMessage.trim();
    const hasMessage = messageText.length > 0;
    const hasFile = pendingFile !== null;
    
    // Only send if there's either a message or a file
    if (!hasMessage && !hasFile) return;

    sendTypingStop(); // Stop typing indicator when sending
    
    try {
      if (hasFile && pendingFile) {
        // Send message with file attachment
        await sendMessage(
          activeConversationId,
          messageText, // Can be empty or have caption
          pendingFile.isImage ? 'IMAGE' : 'FILE',
          {
            fileName: pendingFile.fileName,
            fileSize: pendingFile.fileSize,
            mimeType: pendingFile.mimeType,
            fileUrl: pendingFile.fileUrl,
          }
        );
        setPendingFile(null); // Clear pending file after sending
      } else if (hasMessage) {
        // Send text-only message
        await sendMessage(activeConversationId, messageText);
      }
      
      setNewMessage('');
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing start indicator
    if (e.target.value.trim().length > 0) {
      sendTypingStart();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Auto-stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStop();
      }, 2000);
    } else {
      sendTypingStop();
    }
  };

  if (!activeConversationId || !activeConversation) {
    return (
        <div className="flex-grow flex items-center justify-center text-gray-400">
            {t('messages:emptyState.selectConversation')}
        </div>
    );
  }
  
  const isGroupChat = activeConversation.participantIds.length > 2;
  let chatTitle: string;
  let chatSubtitle: string | undefined;

  if (isGroupChat) {
    chatTitle = activeConversation.name || 'Group Chat';
    chatSubtitle = Object.values(activeConversation.participantNames).join(', ');
  } else {
    const otherParticipantId = activeConversation.participantIds.find(id => id !== currentUser?.id);
    chatTitle = otherParticipantId ? activeConversation.participantNames[otherParticipantId] : t('messages:emptyState.noConversationSelectedTitle');
  }


  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center space-x-3 sticky top-0 bg-white z-10">
        {isGroupChat ? <UserGroupIcon className="w-8 h-8 text-gray-400" /> : <UserCircleIcon className="w-8 h-8 text-gray-400" />}
        <div>
            <h2 className="text-lg font-semibold text-swiss-charcoal leading-tight">{chatTitle}</h2>
            {chatSubtitle && <p className="text-xs text-gray-500 truncate">{chatSubtitle}</p>}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-grow overflow-y-auto p-6 space-y-1"
      >
        {isLoadingMore && (
          <div className="text-center text-sm text-gray-500 py-2">
            {t('messages:loadingMore', 'Loading more messages...')}
          </div>
        )}
        {hasMoreMessages[activeConversationId] && !isLoadingMore && (
          <div className="text-center text-xs text-gray-400 py-2">
            {t('messages:scrollForMore', 'Scroll up for more messages')}
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="border-t border-gray-200 bg-gray-50 relative">
        {/* Pending File Preview */}
        {pendingFile && (
          <div className="p-3 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              {pendingFile.isImage ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img 
                    src={pendingFile.fileUrl} 
                    alt={pendingFile.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-swiss-mint/10 flex items-center justify-center flex-shrink-0">
                  <DocumentIcon className="w-6 h-6 text-swiss-mint" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.fileName}</p>
                <p className="text-xs text-gray-500">
                  {pendingFile.fileSize ? formatFileSize(pendingFile.fileSize) : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemovePendingFile}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label={t('common:remove', 'Remove')}
                title={t('common:remove', 'Remove')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="p-4 flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.csv,.mp4,.mov,.avi,.webm,.ppt,.pptx"
            disabled={isUploading}
          />
          <Button 
            type="button" 
            variant="ghost" 
            className="!p-2 text-gray-500 hover:text-swiss-teal disabled:opacity-50" 
            aria-label={t('common:attachFile')} 
            onClick={() => fileInputRef.current?.click()} 
            title={t('common:attachFile')}
            disabled={isUploading}
          >
            <PaperClipIcon className="w-5 h-5" />
          </Button>
          <div className="relative" ref={emojiPickerRef}>
            <Button 
              type="button" 
              variant="ghost" 
              className="!p-2 text-gray-500 hover:text-swiss-teal" 
              aria-label={t('common:addEmoji')} 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
              title={t('common:addEmoji')}
            >
              <FaceSmileIcon className="w-5 h-5" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg overflow-hidden">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  theme="light"
                  width={350}
                  height={400}
                />
              </div>
            )}
          </div>
          <div className="flex-grow relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder={isUploading ? t('common:uploading', 'Uploading...') : pendingFile ? t('messages:placeholders.addCaption', 'Add a caption...') : t('messages:placeholders.typeMessage')}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent outline-none text-sm shadow-sm disabled:opacity-50"
              autoFocus
              aria-label={t('messages:placeholders.typeMessage')}
              disabled={isUploading}
            />
            {Object.keys(typingUsers).length > 0 && (
              <div className="absolute -top-6 left-0 text-xs text-gray-500 italic">
                {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            size="md" 
            className="!p-2.5 disabled:opacity-50" 
            aria-label={t('common:buttons.sendMessage')}
            disabled={isUploading || (!newMessage.trim() && !pendingFile)}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
