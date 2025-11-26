import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

interface UseMessagingSocketOptions {
  conversationId: string | null;
  userId: string;
  userName: string;
  onNewMessage?: (message: any) => void;
  onMessageUpdate?: (message: any) => void;
  onMessageDelete?: (messageId: string) => void;
  onUserTyping?: (data: { userId: string; userName: string; isTyping: boolean }) => void;
}

export function useMessagingSocket({
  conversationId,
  userId,
  userName,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onUserTyping,
}: UseMessagingSocketOptions) {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  useEffect(() => {
    // Only create socket if we have both conversationId and userId
    if (!conversationId || !userId) {
      // Clean up existing socket if we lose required data
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || socketRef.current?.connected) {
      return;
    }

    isConnectingRef.current = true;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(`${apiUrl}/messaging`, {
      auth: async (cb) => {
        try {
          const token = await getToken();
          cb({ token, userId });
        } catch (error) {
          console.error('Failed to get auth token for WebSocket:', error);
          cb({ token: null, userId });
        }
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false, // Reuse existing connection if available
    });

    socketRef.current = socket;
    isConnectingRef.current = false;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Messaging WebSocket connected');
      if (conversationId) {
        socket.emit('join-conversation', { conversationId });
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      // Only log if it's not a normal client disconnect
      if (reason !== 'io client disconnect') {
        console.log('❌ Messaging WebSocket disconnected:', reason);
      }
    });

    socket.on('connect_error', (error) => {
      // Suppress common expected errors
      const errorMsg = error.message.toLowerCase();
      const isExpectedError = 
        errorMsg.includes('invalid namespace') ||
        errorMsg.includes('websocket is closed') ||
        errorMsg.includes('connection refused') ||
        errorMsg.includes('network error');
      
      if (!isExpectedError) {
        console.warn('⚠️ WebSocket connection error:', error.message);
      }
      // Don't set isConnected to false on connect_error - socket.io will retry
    });

    socket.on('new-message', (data: { conversationId: string; message: any }) => {
      if (data.conversationId === conversationId && onNewMessage) {
        onNewMessage(data.message);
      }
    });

    socket.on('message-updated', (data: { conversationId: string; message: any }) => {
      if (data.conversationId === conversationId && onMessageUpdate) {
        onMessageUpdate(data.message);
      }
    });

    socket.on('message-deleted', (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId === conversationId && onMessageDelete) {
        onMessageDelete(data.messageId);
      }
    });

    socket.on('user-typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId !== userId && onUserTyping) {
        onUserTyping(data);
      }
    });

    return () => {
      isConnectingRef.current = false;
      if (socket && socket.connected) {
        if (conversationId) {
          socket.emit('leave-conversation', { conversationId });
        }
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userId, getToken, conversationId, onNewMessage, onMessageUpdate, onMessageDelete, onUserTyping]);

  // Join/leave conversation
  useEffect(() => {
    if (!socketRef.current || !conversationId || !isConnected) return;

    socketRef.current.emit('join-conversation', { conversationId });
    console.log(`✅ Joined conversation ${conversationId} via WebSocket`);

    return () => {
      if (socketRef.current && conversationId) {
        socketRef.current.emit('leave-conversation', { conversationId });
        console.log(`👋 Left conversation ${conversationId} via WebSocket`);
      }
    };
  }, [conversationId, isConnected]);

  const sendTypingStart = () => {
    if (!socketRef.current || !conversationId || !isConnected) return;
    socketRef.current.emit('typing-start', { conversationId, userId, userName });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  };

  const sendTypingStop = () => {
    if (!socketRef.current || !conversationId || !isConnected) return;
    socketRef.current.emit('typing-stop', { conversationId, userId });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  return {
    isConnected,
    sendTypingStart,
    sendTypingStop,
  };
}

