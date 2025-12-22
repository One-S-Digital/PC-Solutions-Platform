import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'

import { 
  MessageSquare, 
  Plus,
  Search, 
  Send,
  MoreVertical,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  Clock,
  File,
  Download,
  Image as ImageIcon,
  Paperclip,
  Smile,
  X,
  Pencil,
  Trash2,
  Check,
  XCircle
} from 'lucide-react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

import { useApiClient, apiService } from '../services/api'
import logger from '../utils/logger'

import { Conversation, Message } from '../types/api'
import NewConversationModal from '../components/messaging/NewConversationModal'
import DocumentPreviewModal from '../components/DocumentPreviewModal'

// Transform backend conversation data to match frontend format
const transformConversation = (conv: any, currentUserId?: string): Conversation => {
  const participants = conv.participants || []
  const otherParticipant = participants.find((p: any) => p.userId !== currentUserId)
  const otherUser = otherParticipant?.user
  
  const lastMessage = conv.messages?.[0]
  
  return {
    id: conv.id,
    participantId: otherUser?.id || otherParticipant?.userId || '',
    participantName: otherUser ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.email || 'Unknown User' : 'Unknown User',
    participantType: otherUser?.role || 'USER',
    organizationName: otherUser?.orgName || '',
    lastMessageSnippet: lastMessage?.content || '',
    lastMessageAt: conv.lastMessageAt || conv.updatedAt || new Date().toISOString(),
    unreadCount: 0, // TODO: Calculate from message read status
  }
}

// Transform backend message data to match frontend format
const transformMessage = (msg: any, currentUserId?: string): Message & { isFromAdmin: boolean; timestamp: string } => {
  const isFromCurrentUser = msg.senderId === currentUserId
  // isFromAdmin is used for styling - messages from current user appear on the right
  const isFromAdmin = isFromCurrentUser
  
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    sender: {
      id: msg.sender?.id || msg.senderId,
      name: msg.sender ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || msg.sender.email || 'Unknown' : 'Unknown',
      role: msg.sender?.role || 'USER',
    },
    content: msg.content,
    createdAt: msg.createdAt,
    isRead: msg.isRead || false,
    messageType: msg.messageType || 'TEXT',
    fileUrl: msg.fileUrl,
    fileName: msg.fileName,
    fileSize: msg.fileSize,
    mimeType: msg.mimeType,
    isFromAdmin,
    timestamp: msg.createdAt,
  }
}

const Messaging: React.FC = () => {
  // Debug logging removed - use React DevTools for render tracking
  const { t } = useTranslation(['admin', 'common']);
  const { getToken } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false)
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({})
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    isImage: boolean;
  } | null>(null)
  const [previewFile, setPreviewFile] = useState<{
    fileUrl: string;
    fileName: string;
    mimeType: string;
  } | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [showActions, setShowActions] = useState<Record<string, boolean>>({})
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const emojiPickerRef = React.useRef<HTMLDivElement>(null)
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const isDev = import.meta.env.DEV

  // Helper function to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper function to build download URL
  const buildDownloadUrl = (fileUrl?: string): string | null => {
    if (!fileUrl) return null;
    
    const apiBaseUrl = apiClient?.defaults?.baseURL || '/api';
    
    // If already a secure URL (relative path like /api/upload/download/...)
    if (fileUrl.startsWith('/api/upload/download/')) {
      const storageKey = fileUrl.replace('/api/upload/download/', '');
      return `${apiBaseUrl}/upload/download/${storageKey}`;
    }
    
    // If it's a full URL, extract storage key
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      try {
        const url = new URL(fileUrl);
        if (url.pathname.startsWith('/api/upload/download/')) {
          const storageKey = url.pathname.replace('/api/upload/download/', '');
          return `${apiBaseUrl}/upload/download/${storageKey}`;
        } else {
          // Extract storage key from pathname
          const storageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
          return `${apiBaseUrl}/upload/download/${storageKey}`;
        }
      } catch {
        // If URL parsing fails, assume it's a storage key
        return `${apiBaseUrl}/upload/download/${fileUrl}`;
      }
    }
    
    // Assume it's a storage key
    return `${apiBaseUrl}/upload/download/${fileUrl}`;
  };

  // Fetch image with authentication
  const fetchImage = async (message: Message) => {
    if (!message.fileUrl || message.messageType !== 'IMAGE' || imageBlobUrls[message.id] || imageLoading[message.id]) {
      return;
    }

    setImageLoading(prev => ({ ...prev, [message.id]: true }));
    setImageErrors(prev => ({ ...prev, [message.id]: false }));

    try {
      const token = await getToken();
      if (!token) {
        setImageErrors(prev => ({ ...prev, [message.id]: true }));
        setImageLoading(prev => ({ ...prev, [message.id]: false }));
        return;
      }

      const downloadUrl = buildDownloadUrl(message.fileUrl);
      if (!downloadUrl) {
        setImageErrors(prev => ({ ...prev, [message.id]: true }));
        setImageLoading(prev => ({ ...prev, [message.id]: false }));
        return;
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
      setImageBlobUrls(prev => ({ ...prev, [message.id]: blobUrl }));
      setImageLoading(prev => ({ ...prev, [message.id]: false }));
    } catch (error) {
      console.error('Failed to load image:', error);
      setImageErrors(prev => ({ ...prev, [message.id]: true }));
      setImageLoading(prev => ({ ...prev, [message.id]: false }));
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageBlobUrls).forEach(url => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, [imageBlobUrls]);

  // Handle file download
  const handleFileDownload = async (message: Message) => {
    if (!message.fileUrl || !message.fileName) return;
    
    try {
      const token = await getToken();
      if (!token) {
        alert('Authentication required to download file');
        return;
      }

      const downloadUrl = buildDownloadUrl(message.fileUrl);
      if (!downloadUrl) {
        alert('Invalid file URL');
        return;
      }

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = message.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // Get current user's database ID
  const { data: currentUserResponse } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await apiService.getCurrentUser(apiClient);
      return response;
    },
    enabled: !!apiClient,
  })

  const currentUserId = currentUserResponse?.data?.data?.id
  const currentUserRole = currentUserResponse?.data?.data?.role
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN'

  const { data: conversationsResponse, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const response = await apiService.getConversations(apiClient);
        return response;
      } catch (error) {
        if (isDev) {
          console.error('Failed to fetch conversations:', error);
        }
        throw error;
      }
    },
    enabled: !!apiClient,
    onError: (error) => {
      if (isDev) {
        console.error('Failed to fetch conversations:', error);
      }
    }
  })

  // Helper to get timestamp for deduplication
  const toTimestamp = (c: any): number => {
    const dateStr = c.updatedAt || c.lastMessageAt || c.createdAt || '0'
    return new Date(dateStr).getTime()
  }

  // Deduplicate DIRECT conversations (keep newest per other participant)
  const dedupeConversations = (convs: any[], currentUserId?: string): any[] => {
    const directMap = new Map<string, any>()
    const passthrough: any[] = []

    for (const c of convs) {
      // Non-DIRECT conversations pass through as-is
      if (c?.type !== 'DIRECT') {
        passthrough.push(c)
        continue
      }

      // For DIRECT conversations, find the other participant
      const participants = c?.participants || []
      const otherUserId = participants
        .map((p: any) => p.userId || p.user?.id)
        .find((id: string) => id && id !== currentUserId)

      // Use otherUserId as key, or fallback to conversation id
      const key = `DIRECT:${otherUserId || c.id}`

      // Keep the conversation with the latest timestamp
      const existing = directMap.get(key)
      if (!existing || toTimestamp(c) > toTimestamp(existing)) {
        directMap.set(key, c)
      }
    }

    return [...passthrough, ...Array.from(directMap.values())]
  }

  const conversations: Conversation[] = useMemo(
    () => {
      // Handle both response shapes: wrapped ApiResponse or raw array
      const rawConversations =
        conversationsResponse?.data?.data || // wrapped ApiResponse
        conversationsResponse?.data ||       // raw array
        []
      
      // Deduplicate DIRECT conversations before transforming
      const deduped = dedupeConversations(rawConversations, currentUserId)
      
      const transformed = deduped.map((conv: any) => transformConversation(conv, currentUserId))
      return transformed;
    },
    [conversationsResponse, currentUserId]
  )

  const selectedConversationId = selectedConversation?.id

  const { data: messagesResponse, isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) {
        throw new Error('Conversation ID is required');
      }
      try {
        const response = await apiService.getMessages(apiClient, selectedConversationId);
        return response;
      } catch (error) {
        if (isDev) {
          console.error('Failed to fetch messages:', error);
        }
        throw error;
      }
    },
    enabled: !!selectedConversationId && !!apiClient,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    staleTime: 0, // Always refetch when conversation changes
    onError: (error) => {
      if (isDev) {
        console.error('Failed to fetch messages:', error);
      }
    }
  })

  const messages = useMemo(
    () => {
      // Handle both response shapes: wrapped ApiResponse or raw array
      const rawMessages =
        messagesResponse?.data?.data || // wrapped ApiResponse
        messagesResponse?.data ||       // raw array
        []
      // Backend returns messages in descending order (newest first), reverse for display (oldest first)
      return rawMessages.map((msg: any) => transformMessage(msg, currentUserId)).reverse()
    },
    [messagesResponse, currentUserId]
  )

  const filteredConversations = conversations.filter(
    (conversation) =>
      conversation.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conversation.organizationName &&
        conversation.organizationName.toLowerCase().includes(searchQuery.toLowerCase()))

  )

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
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      alert(t('admin:messaging.errors.fileTooLarge', 'File size exceeds 50MB limit'));
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
        assetKind = 'COVER_IMAGE';
      } else if (isVideo || isPresentation) {
        assetKind = 'ELEARNING';
      } else if (isCSV) {
        assetKind = 'CATALOG_CSV';
      } else {
        assetKind = 'DOCUMENT';
      }

      // Upload file with conversationId using the same endpoint as frontend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetKind', assetKind);
      formData.append('conversationId', selectedConversationId);

      const apiBaseUrl = apiClient?.defaults?.baseURL || '/api';
      const uploadUrl = `${apiBaseUrl}/upload/file`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'File upload failed');
      }

      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success || !uploadData.asset) {
        throw new Error('File upload failed');
      }

      const asset = uploadData.asset;
      const fileUrl = asset.publicUrl || asset.url;
      
      // Extract storage key from full URL
      let storageKey: string | null = null;
      if (fileUrl) {
        if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
          storageKey = fileUrl.replace(/^\/api\/upload\/download\//, '');
        } else {
          try {
            const url = new URL(fileUrl);
            const pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            storageKey = pathname;
          } catch {
            const match = fileUrl.match(/\/(uploads|messages|elearning)\/.+$/);
            if (match) {
              storageKey = match[0].substring(1);
            }
          }
        }
      }
      
      if (!storageKey) {
        throw new Error('Failed to extract storage key from uploaded file URL');
      }
      
      // Store the file as pending instead of sending immediately
      setPendingFile({
        fileName: asset.filename || file.name,
        fileSize: asset.size || file.size,
        mimeType: asset.mimeType || asset.contentType || file.type,
        fileUrl: storageKey, // Store storage key, not full URL
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

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { 
      conversationId: string; 
      content: string;
      messageType?: 'TEXT' | 'FILE' | 'IMAGE';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }) => {
      return apiClient.post('/messaging/messages', messageData);
    },
    onSuccess: async () => {
      // Clear input and pending file immediately for better UX
      setNewMessage('');
      setPendingFile(null);
      
      // Invalidate and immediately refetch messages to show the new message
      await queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      await queryClient.refetchQueries({ queryKey: ['messages', selectedConversationId] });
      
      // Invalidate conversations to update last message preview
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        logger.error('Failed to send message:', error);
      }
      alert('Failed to send message. Please try again.');
    },
  });

  const handleSendMessage = () => {
    if (!selectedConversationId) return;
    
    const messageText = newMessage.trim();
    const hasMessage = messageText.length > 0;
    const hasFile = pendingFile !== null;
    
    // Only send if there's either a message or a file
    if (!hasMessage && !hasFile) return;

    if (hasFile && pendingFile) {
      // Send message with file attachment
      sendMessageMutation.mutate({
        conversationId: selectedConversationId,
        content: messageText, // Can be empty or have caption
        messageType: pendingFile.isImage ? 'IMAGE' : 'FILE',
        fileUrl: pendingFile.fileUrl,
        fileName: pendingFile.fileName,
        fileSize: pendingFile.fileSize,
        mimeType: pendingFile.mimeType,
      });
    } else if (hasMessage) {
      // Send text-only message
      sendMessageMutation.mutate({
        conversationId: selectedConversationId,
        content: messageText,
      });
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] space-x-6">
      {/* Conversations List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-swiss-teal" />
              {t('admin:messaging.title', 'Messages')}
            </h2>
            {isAdmin && (
              <button
                onClick={() => setIsNewConversationModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-swiss-mint hover:bg-swiss-teal rounded-lg transition-colors"
                title={t('admin:messaging.newConversation.button', 'New Conversation')}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('admin:messaging.newConversation.button', 'New Conversation')}
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:messaging.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {!apiClient && (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-gray-500">{t('admin:messaging.labels.initializing', 'Initializing...')}</p>
            </div>
          )}
          {isLoadingConversations && (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          )}
          {conversationsError && (
            <div className="p-4 text-red-500">
              <p className="font-medium">{t('admin:messaging.labels.failedToLoad', 'Failed to load conversations.')}</p>
              <p className="text-xs mt-1">{conversationsError instanceof Error ? conversationsError.message : t('common:unknown', 'Unknown error')}</p>
            </div>
          )}
          {!isLoadingConversations && !conversationsError && apiClient && filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">{t('admin:messaging.emptyState.noConversations', 'No conversations found')}</h3>
              <p className="text-xs text-gray-500">
                {searchQuery ? t('admin:messaging.emptyState.tryAdjusting', 'Try adjusting your search') : t('admin:messaging.emptyState.startNew', 'Start a new conversation to get started')}
              </p>
            </div>
          )}
          {!isLoadingConversations && !conversationsError && apiClient && filteredConversations.length > 0 && filteredConversations.map((conversation) => (

            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation?.id === conversation.id ? 'bg-swiss-teal/5' : ''
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-swiss-teal rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {conversation.participantName.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {conversation.participantName}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <Building2 className="h-3 w-3 mr-1" />
                      {conversation.organizationName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {formatTime(conversation.lastMessageAt)}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="bg-swiss-teal text-white text-xs rounded-full px-2 py-1 mt-1">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600 truncate">
                {conversation.lastMessageSnippet || t('admin:messaging.emptyState.noMessagesYetSnippet', 'No messages yet')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-swiss-teal rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {selectedConversation.participantName.charAt(0)}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-lg font-medium text-gray-900">
                    {selectedConversation.participantName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedConversation.participantType} • {selectedConversation.organizationName}
                  </div>
                </div>
              </div>
              <Menu as="div" className="relative">
                <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                  <MoreVertical className="h-4 w-4" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                          >
                            <User className="h-4 w-4 mr-2" />
                            {t('admin:messaging.actions.viewProfile', 'View Profile')}
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            {t('admin:messaging.actions.call', 'Call')}
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages && (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              )}
              {messagesError && (
                <div className="p-4 text-red-500">{t('admin:messaging.labels.failedToLoadMessages', 'Failed to load messages.')}</div>
              )}
              {!isLoadingMessages && !messagesError && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">{t('admin:messaging.emptyState.noMessagesYet', 'No messages yet. Start the conversation!')}</p>
                </div>
              )}
              {!isLoadingMessages && !messagesError && messages.map((message) => {
                const isImage = message.messageType === 'IMAGE' && message.fileUrl;
                const isFile = message.messageType === 'FILE' && message.fileUrl;
                const isDeleted = message.content === '[Message deleted]';

                if (isDeleted) {
                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isFromAdmin
                            ? 'bg-gray-300 text-gray-500'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        <div className="text-sm italic">{t('admin:messaging.messageDeleted', 'Message deleted')}</div>
                      </div>
                    </div>
                  );
                }

                const isEditing = editingMessageId === message.id;
                
                return (
                  <div
                    key={message.id}
                    className={`flex mb-3 ${message.isFromAdmin ? 'justify-end' : 'justify-start'} group relative`}
                    onMouseEnter={() => message.isFromAdmin && !isEditing && setShowActions(prev => ({ ...prev, [message.id]: true }))}
                    onMouseLeave={() => setShowActions(prev => ({ ...prev, [message.id]: false }))}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl shadow-sm relative ${
                        message.isFromAdmin
                          ? 'bg-swiss-teal text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {/* Edit/Delete Actions - Only show for admin's own messages */}
                      {message.isFromAdmin && showActions[message.id] && !isEditing && (
                        <div className="absolute -top-8 right-0 flex space-x-1 bg-white rounded-lg shadow-lg p-1 z-10">
                          <button
                            onClick={() => handleStartEdit(message)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title={t('admin:messaging.edit', 'Edit message')}
                          >
                            <Pencil className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title={t('admin:messaging.delete', 'Delete message')}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}

                      {/* Edit Mode */}
                      {isEditing && (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent text-gray-900 resize-none"
                            rows={3}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleSaveEdit(message.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded hover:bg-white/20 transition-colors"
                              title={t('common:cancel', 'Cancel')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSaveEdit(message.id)}
                              className="p-1.5 rounded hover:bg-white/20 transition-colors"
                              title={t('common:save', 'Save')}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Regular Message Content */}
                      {!isEditing && (
                        <>
                      {/* Image Preview */}
                      {isImage && message.fileUrl && (
                        <div className="mb-2">
                          {!imageBlobUrls[message.id] && !imageLoading[message.id] && !imageErrors[message.id] && (
                            <button
                              onClick={() => fetchImage(message)}
                              className={`w-full flex items-center justify-center p-4 bg-gray-200 rounded-lg mb-2 hover:bg-gray-300 transition-colors ${
                                message.isFromAdmin ? 'bg-swiss-teal/20' : ''
                              }`}
                            >
                              <ImageIcon className="w-8 h-8 text-gray-400 mr-2" />
                              <div className="flex-1 text-left">
                                <p className={`text-sm font-medium ${message.isFromAdmin ? 'text-white' : 'text-gray-900'}`}>
                                  {message.fileName || 'Image'}
                                </p>
                                {message.fileSize && (
                                  <p className={`text-xs ${message.isFromAdmin ? 'text-white/70' : 'text-gray-500'}`}>
                                    {formatFileSize(message.fileSize)} - Click to load
                                  </p>
                                )}
                              </div>
                            </button>
                          )}
                          {imageLoading[message.id] && (
                            <div className="flex items-center justify-center p-4 bg-gray-200 rounded-lg mb-2">
                              <p className={`text-sm ${message.isFromAdmin ? 'text-white' : 'text-gray-600'}`}>
                                {t('admin:messaging.loading', 'Loading...')}
                              </p>
                            </div>
                          )}
                          {imageErrors[message.id] && (
                            <div className="flex items-center justify-center p-4 bg-gray-200 rounded-lg mb-2">
                              <p className={`text-sm text-red-500`}>
                                {t('admin:messaging.loadFailed', 'Failed to load image')}
                              </p>
                            </div>
                          )}
                          {imageBlobUrls[message.id] && !imageLoading[message.id] && !imageErrors[message.id] && (
                            <div className="mb-2">
                              <img
                                src={imageBlobUrls[message.id]}
                                alt={message.fileName || 'Image'}
                                className="max-w-full h-auto rounded-lg cursor-pointer mb-2"
                                onClick={() => window.open(imageBlobUrls[message.id], '_blank')}
                                onError={() => {
                                  setImageErrors(prev => ({ ...prev, [message.id]: true }));
                                  if (imageBlobUrls[message.id]) {
                                    window.URL.revokeObjectURL(imageBlobUrls[message.id]);
                                    setImageBlobUrls(prev => {
                                      const newUrls = { ...prev };
                                      delete newUrls[message.id];
                                      return newUrls;
                                    });
                                  }
                                }}
                              />
                              <div className="flex items-center justify-between">
                                <p className={`text-xs ${message.isFromAdmin ? 'text-white/70' : 'text-gray-500'}`}>
                                  {message.fileName || 'Image'}
                                  {message.fileSize && ` • ${formatFileSize(message.fileSize)}`}
                                </p>
                                <button
                                  onClick={() => handleFileDownload(message)}
                                  className={`p-1.5 rounded hover:opacity-80 transition-opacity ${
                                    message.isFromAdmin
                                      ? 'hover:bg-swiss-teal/30 text-white'
                                      : 'hover:bg-gray-300 text-gray-700'
                                  }`}
                                  title={t('admin:messaging.download', 'Download')}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                          {message.content && message.content.trim() && (
                            <p className="text-sm whitespace-pre-wrap mt-2">{message.content}</p>
                          )}
                        </div>
                      )}

                      {/* File Attachment */}
                      {isFile && message.fileUrl && (
                        <div className="mb-2">
                          <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                            message.isFromAdmin
                              ? 'bg-swiss-teal/20 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}>
                            <button
                              onClick={() => {
                                const downloadUrl = buildDownloadUrl(message.fileUrl);
                                setPreviewFile({
                                  fileUrl: downloadUrl || message.fileUrl || '',
                                  fileName: message.fileName || 'File',
                                  mimeType: message.mimeType || message.fileName?.split('.').pop()?.toUpperCase() || 'PDF',
                                });
                              }}
                              className="flex items-center space-x-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer"
                              title={t('admin:messaging.preview', 'Click to preview')}
                            >
                              <File className="w-5 h-5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
                                {message.fileSize && (
                                  <p className={`text-xs ${message.isFromAdmin ? 'text-white/70' : 'text-gray-500'}`}>
                                    {formatFileSize(message.fileSize)}
                                  </p>
                                )}
                              </div>
                            </button>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileDownload(message);
                                }}
                                className={`p-1.5 rounded hover:opacity-80 transition-opacity ${
                                  message.isFromAdmin
                                    ? 'hover:bg-swiss-teal/30 text-white'
                                    : 'hover:bg-gray-300 text-gray-700'
                                }`}
                                title={t('admin:messaging.download', 'Download')}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {message.content && message.content.trim() && !message.content.startsWith('{') && (
                            <p className="text-sm whitespace-pre-wrap mt-2">{message.content}</p>
                          )}
                        </div>
                      )}

                      {/* Text Content (for TEXT messages or captions) */}
                      {!isImage && !isFile && message.content && message.content.trim() && !message.content.startsWith('{') && (
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      )}
                      
                      <div className={`text-xs mt-1 ${
                        message.isFromAdmin ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 bg-gray-50">
              {/* Pending File Preview */}
              {pendingFile && (
                <div className="p-3 border-b border-gray-200 bg-white">
                  <div className="flex items-center space-x-3">
                    {pendingFile.isImage ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-swiss-mint/10 flex items-center justify-center flex-shrink-0">
                        <File className="w-6 h-6 text-swiss-mint" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(pendingFile.fileSize)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePendingFile}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      aria-label={t('admin:messaging.remove', 'Remove')}
                      title={t('admin:messaging.remove', 'Remove')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4 flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.csv,.mp4,.mov,.avi,.webm,.ppt,.pptx"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-swiss-teal disabled:opacity-50 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label={t('admin:messaging.attachFile', 'Attach file')}
                  title={t('admin:messaging.attachFile', 'Attach file')}
                  disabled={isUploading}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-swiss-teal rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label={t('admin:messaging.addEmoji', 'Add emoji')}
                    title={t('admin:messaging.addEmoji', 'Add emoji')}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
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
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={isUploading ? t('admin:messaging.uploading', 'Uploading...') : pendingFile ? t('admin:messaging.addCaption', 'Add a caption...') : t('admin:messaging.typePlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent outline-none text-sm shadow-sm disabled:opacity-50"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isUploading}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={isUploading || (!newMessage.trim() && !pendingFile)}
                  className="bg-swiss-mint hover:bg-swiss-teal disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg flex items-center transition-colors"
                  aria-label={t('admin:messaging.send', 'Send')}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:messaging.emptyState.selectConversation', 'Select a conversation')}</h3>
              <p className="text-gray-600">{t('admin:messaging.emptyState.chooseConversation', 'Choose a conversation from the list to start messaging.')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewFile && (
        <DocumentPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.fileUrl}
          fileName={previewFile.fileName}
          fileType={previewFile.mimeType}
        />
      )}

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onConversationCreated={async (conversationId) => {
          // Invalidate and refetch conversations first to get the full conversation data
          await queryClient.invalidateQueries({ queryKey: ['conversations'] })
          const conversationsData = await queryClient.fetchQuery({
            queryKey: ['conversations'],
            queryFn: async () => {
              const response = await apiService.getConversations(apiClient)
              return response
            },
          })
          
          // Find and select the newly created conversation (handle both response shapes)
          const rawConversations =
            conversationsData?.data?.data || // wrapped ApiResponse
            conversationsData?.data ||       // raw array
            []
          const newConv = rawConversations.find((c: any) => c.id === conversationId)
          
          if (newConv) {
            const transformed = transformConversation(newConv, currentUserId)
            setSelectedConversation(transformed)
            
            // Immediately refetch messages for the new conversation
            await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
            await queryClient.refetchQueries({ queryKey: ['messages', conversationId] })
          } else {
            // Fallback: create temporary conversation object if not found in list
            // This should rarely happen, but ensures UI doesn't break
            setSelectedConversation({
              id: conversationId,
              participantId: '',
              participantName: '',
              participantType: 'USER' as any,
              organizationName: '',
              lastMessageSnippet: '',
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0,
            })
            
            // Still try to fetch messages
            await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
            await queryClient.refetchQueries({ queryKey: ['messages', conversationId] })
          }
        }}
        currentUserId={currentUserId}
      />
    </div>
  )
}

export default Messaging
