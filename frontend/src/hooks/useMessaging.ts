import { useState, useEffect, useCallback, useRef } from 'react';
import { messagingService } from '../services/messaging';
import { Conversation, Message, MessageType, ConversationType } from '../services/types';

// Hook for conversations
export const useConversations = (params?: {
  page?: number;
  limit?: number;
  type?: ConversationType;
  search?: string;
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await messagingService.getConversations(params);
      setConversations(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async (data: {
    type: ConversationType;
    title?: string;
    participantIds: string[];
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newConversation = await messagingService.createConversation(data);
      setConversations(prev => [newConversation, ...prev]);
      return newConversation;
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConversation = useCallback(async (conversationId: string, data: Partial<Conversation>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedConversation = await messagingService.updateConversation(conversationId, data);
      setConversations(prev => prev.map(conv => conv.id === conversationId ? updatedConversation : conv));
      return updatedConversation;
    } catch (err: any) {
      setError(err.message || 'Failed to update conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);

    try {
      await messagingService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    conversations,
    loading,
    error,
    pagination,
    fetchConversations,
    createConversation,
    updateConversation,
    deleteConversation,
  };
};

// Hook for messages
export const useMessages = (conversationId: string, params?: {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await messagingService.getMessages(conversationId, params);
      setMessages(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, params]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (data: {
    content: string;
    messageType: MessageType;
    replyToId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newMessage = await messagingService.sendMessage({
        conversationId,
        content: data.content,
        messageType: data.messageType,
        replyToId: data.replyToId,
      });
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const updateMessage = useCallback(async (messageId: string, data: Partial<Message>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedMessage = await messagingService.updateMessage(messageId, data);
      setMessages(prev => prev.map(msg => msg.id === messageId ? updatedMessage : msg));
      return updatedMessage;
    } catch (err: any) {
      setError(err.message || 'Failed to update message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    setLoading(true);
    setError(null);

    try {
      await messagingService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const updatedMessage = await messagingService.markMessageAsRead(messageId);
      setMessages(prev => prev.map(msg => msg.id === messageId ? updatedMessage : msg));
    } catch (err: any) {
      console.error('Failed to mark message as read:', err);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    pagination,
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    markAsRead,
  };
};

// Hook for real-time messaging
export const useRealTimeMessaging = (conversationId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = messagingService.connectWebSocket();
      if (ws) {
        wsRef.current = ws;
        setIsConnected(true);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case 'new_message':
                setNewMessages(prev => [...prev, data.message]);
                break;
              case 'typing_start':
                setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
                break;
              case 'typing_stop':
                setTypingUsers(prev => prev.filter(id => id !== data.userId));
                break;
              case 'message_updated':
                // Handle message updates
                break;
              case 'message_deleted':
                // Handle message deletions
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } else {
        // Fallback to polling
        startPolling();
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      startPolling();
    }
  }, [conversationId]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const newMessages = await messagingService.pollForNewMessages(conversationId);
        if (newMessages.length > 0) {
          setNewMessages(prev => [...prev, ...newMessages]);
        }
      } catch (error) {
        console.error('Error polling for new messages:', error);
      }
    }, 5000); // Poll every 5 seconds
  }, [conversationId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    try {
      await messagingService.sendTypingIndicator(conversationId, isTyping);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [conversationId, connect, disconnect]);

  return {
    isConnected,
    newMessages,
    typingUsers,
    sendTypingIndicator,
    clearNewMessages: () => setNewMessages([]),
  };
};

// Hook for messaging statistics
export const useMessagingStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await messagingService.getMessagingStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messaging statistics');
      console.error('Error fetching messaging stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
};

// Hook for unread count
export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await messagingService.getUnreadCount();
      setUnreadCount(response.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch unread count');
      console.error('Error fetching unread count:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    loading,
    error,
    refreshUnreadCount: fetchUnreadCount,
  };
};

// Hook for search functionality
export const useMessagingSearch = () => {
  const [searchResults, setSearchResults] = useState<{
    messages: Message[];
    conversations: Conversation[];
  }>({ messages: [], conversations: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: {
    conversationId?: string;
    senderId?: string;
    messageType?: MessageType;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    if (!query.trim()) {
      setSearchResults({ messages: [], conversations: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [messages, conversations] = await Promise.all([
        messagingService.searchMessages(query, filters),
        messagingService.searchConversations(query, {
          type: filters?.conversationId ? undefined : 'DIRECT' as any, // Default to direct conversations
        }),
      ]);

      setSearchResults({ messages, conversations });
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Error searching messaging:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults({ messages: [], conversations: [] });
    setError(null);
  }, []);

  return {
    searchResults,
    loading,
    error,
    search,
    clearSearch,
  };
};

// Hook for file uploads
export const useMessageFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await messagingService.uploadMessageFile(file, (progress) => {
        setProgress(progress);
      });
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadFile,
  };
};

export default useConversations;