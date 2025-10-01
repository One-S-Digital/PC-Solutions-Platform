import { apiClient } from './api';
import { Conversation, Message, MessageType, ConversationType } from './types';

// Messaging service for managing messaging-related API calls
export class MessagingService {
  // Conversation endpoints
  async getConversations(params?: {
    page?: number;
    limit?: number;
    type?: ConversationType;
    search?: string;
  }): Promise<{
    data: Conversation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.get(`/messaging/conversations?${queryParams.toString()}`);
  }

  async getConversationById(conversationId: string): Promise<Conversation> {
    return apiClient.get<Conversation>(`/messaging/conversations/${conversationId}`);
  }

  async createConversation(data: {
    type: ConversationType;
    title?: string;
    participantIds: string[];
  }): Promise<Conversation> {
    return apiClient.post<Conversation>('/messaging/conversations', data);
  }

  async updateConversation(conversationId: string, data: Partial<Conversation>): Promise<Conversation> {
    return apiClient.patch<Conversation>(`/messaging/conversations/${conversationId}`, data);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return apiClient.delete(`/messaging/conversations/${conversationId}`);
  }

  async addParticipant(conversationId: string, userId: string): Promise<Conversation> {
    return apiClient.post<Conversation>(`/messaging/conversations/${conversationId}/participants`, { userId });
  }

  async removeParticipant(conversationId: string, userId: string): Promise<Conversation> {
    return apiClient.delete<Conversation>(`/messaging/conversations/${conversationId}/participants/${userId}`);
  }

  // Message endpoints
  async getMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<{
    data: Message[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.before) queryParams.append('before', params.before);
    if (params?.after) queryParams.append('after', params.after);

    return apiClient.get(`/messaging/conversations/${conversationId}/messages?${queryParams.toString()}`);
  }

  async getMessageById(messageId: string): Promise<Message> {
    return apiClient.get<Message>(`/messaging/messages/${messageId}`);
  }

  async sendMessage(data: {
    conversationId?: string;
    receiverId?: string;
    content: string;
    messageType: MessageType;
    replyToId?: string;
  }): Promise<Message> {
    return apiClient.post<Message>('/messaging/messages', data);
  }

  async updateMessage(messageId: string, data: Partial<Message>): Promise<Message> {
    return apiClient.patch<Message>(`/messaging/messages/${messageId}`, data);
  }

  async deleteMessage(messageId: string): Promise<void> {
    return apiClient.delete(`/messaging/messages/${messageId}`);
  }

  async markMessageAsRead(messageId: string): Promise<Message> {
    return apiClient.patch<Message>(`/messaging/messages/${messageId}/read`);
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    return apiClient.patch(`/messaging/conversations/${conversationId}/read`);
  }

  // File upload for messages
  async uploadMessageFile(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string }> {
    return apiClient.uploadFile<{ url: string; filename: string }>('/messaging/upload', file, onProgress);
  }

  // Search functionality
  async searchMessages(query: string, filters?: {
    conversationId?: string;
    senderId?: string;
    messageType?: MessageType;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Message[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.conversationId) queryParams.append('conversationId', filters.conversationId);
    if (filters?.senderId) queryParams.append('senderId', filters.senderId);
    if (filters?.messageType) queryParams.append('messageType', filters.messageType);
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const response = await apiClient.get<{ data: Message[] }>(`/messaging/search?${queryParams.toString()}`);
    return response.data;
  }

  async searchConversations(query: string, filters?: {
    type?: ConversationType;
    participantId?: string;
  }): Promise<Conversation[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.participantId) queryParams.append('participantId', filters.participantId);

    const response = await apiClient.get<{ data: Conversation[] }>(`/messaging/conversations/search?${queryParams.toString()}`);
    return response.data;
  }

  // Analytics endpoints
  async getMessagingStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    unreadMessages: number;
    conversationsByType: Record<ConversationType, number>;
    messagesByType: Record<MessageType, number>;
    messagesByMonth: Record<string, number>;
    averageResponseTime: number;
    mostActiveConversations: Array<{ conversation: Conversation; messageCount: number }>;
  }> {
    return apiClient.get('/messaging/stats');
  }

  // Notification endpoints
  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get('/messaging/unread-count');
  }

  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', params.unreadOnly.toString());

    return apiClient.get(`/messaging/notifications?${queryParams.toString()}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    return apiClient.patch(`/messaging/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return apiClient.patch('/messaging/notifications/read-all');
  }

  // Real-time messaging (WebSocket) - placeholder for future implementation
  connectWebSocket(): WebSocket | null {
    // This would be implemented with a WebSocket connection
    // For now, return null and use polling
    console.log('WebSocket connection not implemented yet, using polling');
    return null;
  }

  // Polling for new messages (fallback when WebSocket is not available)
  async pollForNewMessages(conversationId: string, lastMessageId?: string): Promise<Message[]> {
    const params = lastMessageId ? { after: lastMessageId } : {};
    const response = await this.getMessages(conversationId, params);
    return response.data;
  }

  // Typing indicators
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    return apiClient.post(`/messaging/conversations/${conversationId}/typing`, { isTyping });
  }

  // Message reactions
  async addReaction(messageId: string, reaction: string): Promise<Message> {
    return apiClient.post<Message>(`/messaging/messages/${messageId}/reactions`, { reaction });
  }

  async removeReaction(messageId: string, reaction: string): Promise<Message> {
    return apiClient.delete<Message>(`/messaging/messages/${messageId}/reactions/${reaction}`);
  }

  // Message forwarding
  async forwardMessage(messageId: string, conversationIds: string[]): Promise<Message[]> {
    return apiClient.post<Message[]>(`/messaging/messages/${messageId}/forward`, { conversationIds });
  }

  // Message threading
  async getMessageThread(messageId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/messaging/messages/${messageId}/thread`);
  }

  // Archive/Unarchive conversations
  async archiveConversation(conversationId: string): Promise<Conversation> {
    return apiClient.patch<Conversation>(`/messaging/conversations/${conversationId}/archive`);
  }

  async unarchiveConversation(conversationId: string): Promise<Conversation> {
    return apiClient.patch<Conversation>(`/messaging/conversations/${conversationId}/unarchive`);
  }

  // Mute/Unmute conversations
  async muteConversation(conversationId: string, duration?: number): Promise<Conversation> {
    return apiClient.patch<Conversation>(`/messaging/conversations/${conversationId}/mute`, { duration });
  }

  async unmuteConversation(conversationId: string): Promise<Conversation> {
    return apiClient.patch<Conversation>(`/messaging/conversations/${conversationId}/unmute`);
  }
}

// Create singleton instance
export const messagingService = new MessagingService();

export default messagingService;