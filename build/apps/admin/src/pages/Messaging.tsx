
import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

const Messaging: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')

  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const { data: conversationsResponse, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiService.getConversations(apiClient),
    enabled: !!apiClient,
  })

  const conversations: Conversation[] = useMemo(
    () => conversationsResponse?.data?.data || [],
    [conversationsResponse]
  )

  const selectedConversationId = selectedConversation?.id

  const { data: messagesResponse, isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => apiService.getMessages(apiClient, selectedConversationId!),
    enabled: !!selectedConversationId && !!apiClient,
  })

  const messages: Message[] = useMemo(
    () => messagesResponse?.data?.data || [],
    [messagesResponse]
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
            Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">

          {isLoadingConversations && <LoadingSpinner />}
          {conversationsError && <div className="p-4 text-red-500">Failed to load conversations.</div>}
              {filteredConversations.map((conversation) => (

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
                    {formatTime(conversation.lastMessageTime)}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="bg-swiss-teal text-white text-xs rounded-full px-2 py-1 mt-1">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600 truncate">
                {conversation.lastMessage}
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
                            View Profile
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
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

              {isLoadingMessages && <LoadingSpinner />}
              {messagesError && <div className="p-4 text-red-500">Failed to load messages.</div>}
              {messages.map((message) => (

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
                    placeholder="Type your message..."
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-600">Choose a conversation from the list to start messaging.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Messaging
