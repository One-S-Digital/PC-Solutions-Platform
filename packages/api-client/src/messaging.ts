import { apiClient } from './client'
import { PaginatedResponse } from '@pc-solutions/api-types'

export interface Conversation {
  id: string
  name?: string
  participantIds: string[]
  participantNames: Record<string, string>
  participantRoles: Record<string, string>
  lastMessageSnippet?: string
  lastMessageTimestamp?: string
  lastMessageSenderId?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: string
  content: string
  timestamp: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateConversationRequest {
  participantIds: string[]
  name?: string
}

export interface SendMessageRequest {
  content: string
}

export interface ConversationsQuery {
  page?: number
  limit?: number
  search?: string
}

export interface MessagesQuery {
  page?: number
  limit?: number
  before?: string
  after?: string
}

export const messagingApi = {
  // Conversations
  getConversations: (query?: ConversationsQuery): Promise<PaginatedResponse<Conversation>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<Conversation>>(`/conversations?${params.toString()}`)
  },

  getConversation: (conversationId: string): Promise<{ data: Conversation }> => {
    return apiClient.get<{ data: Conversation }>(`/conversations/${conversationId}`)
  },

  createConversation: (data: CreateConversationRequest): Promise<{ data: Conversation }> => {
    return apiClient.post<{ data: Conversation }>('/conversations', data)
  },

  updateConversation: (conversationId: string, data: { name?: string }): Promise<{ data: Conversation }> => {
    return apiClient.put<{ data: Conversation }>(`/conversations/${conversationId}`, data)
  },

  deleteConversation: (conversationId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/conversations/${conversationId}`)
  },

  // Messages
  getMessages: (conversationId: string, query?: MessagesQuery): Promise<PaginatedResponse<Message>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.before) params.append('before', query.before)
    if (query?.after) params.append('after', query.after)
    
    return apiClient.get<PaginatedResponse<Message>>(`/conversations/${conversationId}/messages?${params.toString()}`)
  },

  sendMessage: (conversationId: string, data: SendMessageRequest): Promise<{ data: Message }> => {
    return apiClient.post<{ data: Message }>(`/conversations/${conversationId}/messages`, data)
  },

  markMessageAsRead: (messageId: string): Promise<{ message: string }> => {
    return apiClient.patch<{ message: string }>(`/messages/${messageId}/read`, {})
  },

  markConversationAsRead: (conversationId: string): Promise<{ message: string }> => {
    return apiClient.patch<{ message: string }>(`/conversations/${conversationId}/read`, {})
  },
}