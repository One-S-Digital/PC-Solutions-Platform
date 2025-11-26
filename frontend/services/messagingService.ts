import { apiService, ApiResponse } from './api';
import { Conversation, Message, User } from '../types';

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
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
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
  async getConversations(token?: string): Promise<Conversation[]> {
    try {
      const response = await apiService.get<Conversation[]>('/messaging/conversations', { token });
      console.log('📨 getConversations response:', JSON.stringify({ 
        success: response.success, 
        hasData: !!response.data, 
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        message: response.message,
        dataPreview: Array.isArray(response.data) ? response.data.slice(0, 2) : response.data,
        fullResponse: response 
      }, null, 2));
      
      // Handle empty array case - this is valid
      if (response.success === false) {
        console.error('❌ Response indicates failure:', response);
        throw new Error(response.message || 'Failed to fetch conversations');
      }
      
      // If data is undefined or null, return empty array (valid - user has no conversations)
      if (response.data === undefined || response.data === null) {
        console.warn('⚠️ No data in response, returning empty array');
        return [];
      }
      
      // Ensure data is an array
      const conversations = Array.isArray(response.data) ? response.data : [];
      console.log('📨 Transforming conversations:', { count: conversations.length });
      
      // Transform and deduplicate by ID (keep first occurrence)
      const transformed = conversations.map(conv => this.transformConversation(conv));
      const seen = new Set<string>();
      const unique = transformed.filter(conv => {
        if (seen.has(conv.id)) {
          console.warn(`⚠️ Duplicate conversation detected: ${conv.id}, skipping`);
          return false;
        }
        seen.add(conv.id);
        return true;
      });
      
      return unique;
    } catch (error) {
      console.error('❌ Error in getConversations:', error);
      throw error;
    }
  }

  async getConversationById(id: string, token?: string): Promise<Conversation> {
    const response = await apiService.get<Conversation>(`/messaging/conversations/${id}`, { token });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch conversation');
    }
    return this.transformConversation(response.data);
  }

  async createConversation(data: ConversationCreateData, token?: string): Promise<Conversation> {
    console.log('📝 Creating conversation:', JSON.stringify({ 
      type: data.type,
      title: data.title,
      participantIds: data.participantIds,
      participantCount: data.participantIds.length,
      hasToken: !!token 
    }, null, 2));
    try {
      const response = await apiService.post<Conversation>('/messaging/conversations', data, { token });
      console.log('📝 Create conversation response:', JSON.stringify({ 
        success: response.success, 
        hasData: !!response.data,
        message: response.message,
        responseType: typeof response,
        responseKeys: Object.keys(response),
        dataPreview: response.data ? {
          id: response.data.id,
          type: (response.data as any).type,
          title: (response.data as any).title,
        } : null,
        fullResponse: response
      }, null, 2));
      
      // Check if response is already the conversation object (direct response from backend)
      if (response && typeof response === 'object' && 'id' in response && 'type' in response && !('success' in response)) {
        console.log('✅ Received direct conversation object from backend');
        const transformed = this.transformConversation(response as any);
        console.log('✅ Conversation created successfully:', { id: transformed.id, type: transformed.type });
        return transformed;
      }
      
      if (!response.success) {
        const errorMsg = response.message || 'Failed to create conversation';
        console.error('❌ Conversation creation failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!response.data) {
        console.error('❌ No conversation data in response');
        throw new Error('No conversation data returned from server');
      }
      
      const transformed = this.transformConversation(response.data);
      console.log('✅ Conversation created successfully:', { id: transformed.id, type: transformed.type });
      return transformed;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  async updateConversation(id: string, data: Partial<ConversationCreateData>, token?: string): Promise<Conversation> {
    const response = await apiService.put<Conversation>(`/messaging/conversations/${id}`, data, { token });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update conversation');
    }
    return this.transformConversation(response.data);
  }

  async deleteConversation(id: string, token?: string): Promise<void> {
    const response = await apiService.delete(`/messaging/conversations/${id}`, { token });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete conversation');
    }
  }

  // Messages
  async getMessages(conversationId: string, page = 1, limit = 50, token?: string): Promise<{ messages: Message[]; hasMore: boolean }> {
    const response = await apiService.get<Message[]>(
      `/messaging/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
      { token }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch messages');
    }
    // Backend returns array directly, not wrapped in messages/pagination
    const messages = Array.isArray(response.data) ? response.data : [];
    const hasMore = messages.length === limit; // If we got a full page, there might be more
    return {
      messages: messages.map(msg => this.transformMessage(msg)),
      hasMore,
    };
  }

  async sendMessage(data: MessageCreateData, token?: string): Promise<Message> {
    const response = await apiService.post<Message>('/messaging/messages', data, { token });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to send message');
    }
    return this.transformMessage(response.data);
  }

  async markMessageAsRead(messageId: string, token?: string): Promise<void> {
    const response = await apiService.put(`/messaging/messages/${messageId}/read`, {}, { token });
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark message as read');
    }
  }

  async markConversationAsRead(conversationId: string, token?: string): Promise<void> {
    const response = await apiService.post(`/messaging/conversations/${conversationId}/read`, {}, { token });
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark conversation as read');
    }
  }

  async updateMessage(messageId: string, content: string, token?: string): Promise<Message> {
    const response = await apiService.patch<Message>(`/messaging/messages/${messageId}`, { content }, { token });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update message');
    }
    return this.transformMessage(response.data);
  }

  async deleteMessage(messageId: string, token?: string): Promise<void> {
    const response = await apiService.delete(`/messaging/messages/${messageId}`, { token });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete message');
    }
  }

  // Participants
  async getConversationParticipants(conversationId: string, token?: string): Promise<ConversationParticipant[]> {
    const response = await apiService.get<ConversationParticipant[]>(`/messaging/conversations/${conversationId}/participants`, { token });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch conversation participants');
    }
    return response.data;
  }

  async addParticipant(conversationId: string, userId: string, token?: string): Promise<void> {
    const response = await apiService.post(`/messaging/conversations/${conversationId}/participants`, { userId }, { token });
    if (!response.success) {
      throw new Error(response.message || 'Failed to add participant');
    }
  }

  async removeParticipant(conversationId: string, userId: string, token?: string): Promise<void> {
    const response = await apiService.delete(`/messaging/conversations/${conversationId}/participants/${userId}`, { token });
    if (!response.success) {
      throw new Error(response.message || 'Failed to remove participant');
    }
  }

  // Transform conversation data to include legacy fields for UI compatibility
  private transformConversation(conv: any): Conversation {
    const participants = conv.participants || [];
    const participantNames: Record<string, string> = {};
    const participantRoles: Record<string, string> = {};
    
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
  transformMessage(msg: any): Message {
    // Use file metadata from database fields first (new format)
    let fileUrl: string | undefined = msg.fileUrl;
    let fileName: string | undefined = msg.fileName;
    let fileSize: number | undefined = msg.fileSize;
    let mimeType: string | undefined = msg.mimeType;
    let content = msg.content;
    
    // Fallback: Extract file metadata from content if database fields are not available (backward compatibility)
    if ((msg.messageType === 'FILE' || msg.messageType === 'IMAGE') && !fileUrl) {
      // If content is a URL, use it as fileUrl
      if (msg.content && (msg.content.startsWith('http://') || msg.content.startsWith('https://'))) {
        fileUrl = msg.content;
        // Try to extract filename from URL or use a default
        if (!fileName) {
          fileName = msg.content.split('/').pop() || 'file';
        }
        content = ''; // Clear URL from content for file messages
      }
      // If content is JSON, parse it
      else if (msg.content && msg.content.startsWith('{')) {
        try {
          const fileData = JSON.parse(msg.content);
          fileUrl = fileUrl || fileData.url || fileData.fileUrl;
          fileName = fileName || fileData.filename || fileData.fileName;
          fileSize = fileSize || fileData.size || fileData.fileSize;
          mimeType = mimeType || fileData.mimeType || fileData.contentType;
          // Only use caption if it exists, otherwise clear content for file messages
          content = fileData.caption || ''; // Clear JSON metadata from content
        } catch (e) {
          // If parsing fails, treat content as URL
          if (!fileUrl) {
            fileUrl = msg.content;
          }
          content = ''; // Clear content for file messages
        }
      }
    }

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.sender ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || msg.sender.email || 'Unknown' : 'Unknown',
      senderRole: msg.sender?.role || 'USER',
      content: content,
      timestamp: msg.createdAt,
      isRead: msg.isRead,
      messageType: msg.messageType || 'TEXT',
      fileUrl,
      fileName,
      fileSize,
      mimeType,
    };
  }
}

export const messagingService = new MessagingService();
