import { apiService, ApiResponse } from './api';
import { Conversation, Message, User, UserRole } from '../types';

export interface ConversationCreateData {
  type: 'DIRECT' | 'GROUP' | 'SUPPORT';
  title?: string;
  participantIds: string[];
}

export interface MessageCreateData {
  conversationId?: string;
  receiverId?: string;
  content: string;
  messageType?: 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM';
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string;
  isActive: boolean;
  user: User;
}

class MessagingService {
  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await apiService.get<Conversation[]>('/conversations');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch conversations');
    }
    return response.data.map(conv => this.transformConversation(conv));
  }

  async getConversationById(id: string): Promise<Conversation> {
    const response = await apiService.get<Conversation>(`/conversations/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch conversation');
    }
    return this.transformConversation(response.data);
  }

  async createConversation(data: ConversationCreateData): Promise<Conversation> {
    const response = await apiService.post<Conversation>('/conversations', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create conversation');
    }
    return this.transformConversation(response.data);
  }

  async updateConversation(id: string, data: Partial<ConversationCreateData>): Promise<Conversation> {
    const response = await apiService.put<Conversation>(`/conversations/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update conversation');
    }
    return this.transformConversation(response.data);
  }

  async deleteConversation(id: string): Promise<void> {
    const response = await apiService.delete(`/conversations/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete conversation');
    }
  }

  // Messages
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<{ messages: Message[]; pagination: any }> {
    const response = await apiService.get<{ messages: Message[]; pagination: any }>(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch messages');
    }
    return {
      messages: response.data.messages.map(msg => this.transformMessage(msg)),
      pagination: response.data.pagination,
    };
  }

  async sendMessage(data: MessageCreateData): Promise<Message> {
    const response = await apiService.post<Message>('/messages', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to send message');
    }
    return this.transformMessage(response.data);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const response = await apiService.patch(`/messages/${messageId}/read`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark message as read');
    }
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    const response = await apiService.patch(`/conversations/${conversationId}/read`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark conversation as read');
    }
  }

  // Participants
  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const response = await apiService.get<ConversationParticipant[]>(`/conversations/${conversationId}/participants`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch conversation participants');
    }
    return response.data;
  }

  async addParticipant(conversationId: string, userId: string): Promise<void> {
    const response = await apiService.post(`/conversations/${conversationId}/participants`, { userId });
    if (!response.success) {
      throw new Error(response.message || 'Failed to add participant');
    }
  }

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    const response = await apiService.delete(`/conversations/${conversationId}/participants/${userId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to remove participant');
    }
  }

  // Transform conversation data to include legacy fields for UI compatibility
  private transformConversation(conv: any): Conversation {
    const participants = conv.participants || [];
    const participantNames: Record<string, string> = {};
    const participantRoles: Record<string, UserRole> = {};
    
    participants.forEach((participant: any) => {
      if (participant.user) {
        participantNames[participant.userId] = `${participant.user.firstName} ${participant.user.lastName}`;
        participantRoles[participant.userId] = participant.user.role;
      }
    });

    return {
      id: conv.id,
      name: conv.title,
      participantIds: participants.map((p: any) => p.userId),
      participantNames,
      participantRoles,
      lastMessageSnippet: conv.lastMessage?.content,
      lastMessageTimestamp: conv.lastMessageAt,
      lastMessageSenderId: conv.lastMessage?.senderId,
    };
  }

  // Transform message data to include legacy fields for UI compatibility
  private transformMessage(msg: any): Message {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Unknown',
      senderRole: msg.sender?.role || 'USER',
      content: msg.content,
      timestamp: msg.createdAt,
      isRead: msg.isRead,
    };
  }
}

export const messagingService = new MessagingService();
