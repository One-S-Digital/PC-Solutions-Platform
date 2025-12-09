console.log('📦 Messaging.tsx module loaded');

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
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
  Clock
} from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

import { useApiClient, apiService } from '../services/api'
import logger from '../utils/logger'

import { Conversation, Message } from '../types/api'

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
    isFromAdmin,
    timestamp: msg.createdAt,
  }
}

const Messaging: React.FC = () => {
  // Debug logging removed - use React DevTools for render tracking
  const { t } = useTranslation(['admin', 'common']);
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  // Get current user's database ID
  const { data: currentUserResponse } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      console.log('👤 Fetching current user...');
      const response = await apiService.getCurrentUser(apiClient);
      console.log('👤 Current user response:', response?.data);
      return response;
    },
    enabled: !!apiClient,
  })

  const currentUserId = currentUserResponse?.data?.data?.id

  // Debug logging
  React.useEffect(() => {
    console.log('💬 Messaging component mounted/updated:', {
      hasApiClient: !!apiClient,
      hasCurrentUserResponse: !!currentUserResponse,
      currentUserId,
      apiClientBaseURL: apiClient?.defaults?.baseURL
    });
  }, [apiClient, currentUserId, currentUserResponse])

  const { data: conversationsResponse, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('📨 Fetching conversations...', { apiClient: !!apiClient, baseURL: apiClient?.defaults?.baseURL });
      try {
        const response = await apiService.getConversations(apiClient);
        console.log('📨 Conversations response:', {
          hasResponse: !!response,
          hasData: !!response?.data,
          hasNestedData: !!response?.data?.data,
          dataType: Array.isArray(response?.data?.data) ? 'array' : typeof response?.data?.data,
          dataLength: Array.isArray(response?.data?.data) ? response.data.data.length : 'N/A',
          fullResponse: response?.data
        });
        return response;
      } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        throw error;
      }
    },
    enabled: !!apiClient,
    onError: (error) => {
      console.error('❌ Failed to fetch conversations:', error);
    }
  })

  const conversations: Conversation[] = useMemo(
    () => {
      const rawConversations = conversationsResponse?.data?.data || []
      console.log('🔄 Transforming conversations:', {
        rawCount: rawConversations.length,
        currentUserId,
        rawConversations: rawConversations.slice(0, 2) // Log first 2 for debugging
      });
      const transformed = rawConversations.map((conv: any) => transformConversation(conv, currentUserId))
      console.log('🔄 Transformed conversations:', transformed.slice(0, 2));
      return transformed;
    },
    [conversationsResponse, currentUserId]
  )

  const selectedConversationId = selectedConversation?.id

  const { data: messagesResponse, isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: async () => {
      console.log('💬 Fetching messages for conversation:', selectedConversationId);
      try {
        const response = await apiService.getMessages(apiClient, selectedConversationId!);
        console.log('💬 Messages response:', {
          hasResponse: !!response,
          hasData: !!response?.data,
          hasNestedData: !!response?.data?.data,
          dataType: Array.isArray(response?.data?.data) ? 'array' : typeof response?.data?.data,
          dataLength: Array.isArray(response?.data?.data) ? response.data.data.length : 'N/A'
        });
        return response;
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }
    },
    enabled: !!selectedConversationId && !!apiClient,
    onError: (error) => {
      console.error('❌ Failed to fetch messages:', error);
    }
  })

  const messages = useMemo(
    () => {
      const rawMessages = messagesResponse?.data?.data || []
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

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { conversationId: string; content: string }) =>
      apiService.sendMessage(apiClient, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage('');
    },
    onError: (error) => {
      logger.error('Failed to send message:', error);
      // You might want to show an error toast to the user
    },
  });

  const handleSendMessage = () => {

    if (newMessage.trim() && selectedConversationId) {
      sendMessageMutation.mutate({
        conversationId: selectedConversationId,
        content: newMessage,
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
          <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <MessageSquare className="h-5 w-5 mr-2 text-swiss-teal" />
            {t('admin:messaging.title', 'Messages')}
          </h2>
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
              {!isLoadingMessages && !messagesError && messages.map((message) => (

                <div
                  key={message.id}
                  className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isFromAdmin
                        ? 'bg-swiss-teal text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.isFromAdmin ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={t('admin:messaging.typePlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-swiss-mint hover:bg-swiss-teal disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg flex items-center"
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
    </div>
  )
}

export default Messaging
