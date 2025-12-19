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
  const { getToken, isSignedIn } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const tokenRef = useRef<string | null>(null);
  const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';
  
  // Store callbacks in refs to avoid recreating socket on callback changes
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageUpdateRef = useRef(onMessageUpdate);
  const onMessageDeleteRef = useRef(onMessageDelete);
  const onUserTypingRef = useRef(onUserTyping);
  
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageUpdateRef.current = onMessageUpdate;
    onMessageDeleteRef.current = onMessageDelete;
    onUserTypingRef.current = onUserTyping;
  });

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

    // If user signed out and auth is required, disconnect
    if (!skipAuth && !isSignedIn) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // If socket already exists and is connected, don't create a new one
    // (cleanup will handle disconnection when dependencies change)
    if (socketRef.current?.connected) {
      return;
    }

    const connectSocket = async () => {
      isConnectingRef.current = true;

      try {
        // Get token before creating socket
        let token: string | null = null;
        if (!skipAuth) {
          token = await getToken();
          
          // Retry once after 500ms if token is null
          if (!token && isSignedIn) {
            console.log('🔌 WebSocket: Token not available, retrying in 500ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
            token = await getToken();
          }
          
          if (!token && isSignedIn) {
            console.warn('⚠️ WebSocket: Token not available after retry. Connection may fail.');
          } else if (!token) {
            console.warn('⚠️ WebSocket: No token available and user not signed in. Skipping connection.');
            isConnectingRef.current = false;
            return;
          }
        }

        // Log token presence (not the token itself)
        if (skipAuth) {
          console.log('🔌 WebSocket: Connecting without auth (VITE_SKIP_AUTH=true)');
        } else if (token) {
          console.log('🔌 WebSocket: Connecting with token (token present)');
        } else {
          console.warn('⚠️ WebSocket: No token available');
          isConnectingRef.current = false;
          return;
        }

        tokenRef.current = token;

        // Construct WebSocket URL: namespace is /messaging, so connect to base URL + /messaging
        // VITE_API_URL might be https://domain.com/api, so we need to remove /api for Socket.IO
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const baseUrl = rawApiUrl.replace(/\/api\/?$/, ''); // Remove trailing /api if present
        const socketUrl = `${baseUrl}/messaging`;
        
        console.log('🔌 WebSocket: Connecting to', socketUrl, {
          rawApiUrl,
          baseUrl,
          namespace: '/messaging',
        });
        
        const socket = io(socketUrl, {
          auth: token ? { token } : undefined,
          transports: ['websocket'],
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          timeout: 20000,
          autoConnect: true,
          forceNew: false,
          withCredentials: true,
        });

        socketRef.current = socket;
        isConnectingRef.current = false;

        socket.on('connect', () => {
          setIsConnected(true);
          console.log('✅ Messaging WebSocket connected');
        });

        socket.on('disconnect', (reason) => {
          setIsConnected(false);
          // Only log if it's not a normal client disconnect
          if (reason !== 'io client disconnect') {
            console.log('❌ Messaging WebSocket disconnected:', reason);
          }
        });

        socket.on('connect_error', (error) => {
          const errorMsg = error.message.toLowerCase();
          
          // Detect auth failures
          const isAuthError = !skipAuth && (
            errorMsg.includes('missing token') ||
            errorMsg.includes('invalid token') ||
            errorMsg.includes('unauthorized') ||
            errorMsg.includes('user not provisioned') ||
            errorMsg.includes('authentication failed')
          );
          
          if (isAuthError) {
            // Disconnect on auth failure to prevent retry loops
            setIsConnected(false);
            socket.disconnect();
            socketRef.current = null;
            isConnectingRef.current = false;
            
            console.warn('⚠️ WebSocket: Authentication failed. Please sign in again.');
            console.warn('⚠️ WebSocket: Disconnected due to authentication error.');
            return;
          }
          
          // Suppress common expected errors (non-auth)
          const isExpectedError = 
            errorMsg.includes('invalid namespace') ||
            errorMsg.includes('websocket is closed') ||
            errorMsg.includes('connection refused') ||
            errorMsg.includes('network error');
          
          if (!isExpectedError) {
            console.warn('⚠️ WebSocket connection error:', error.message);
          }
          
          // Don't set isConnected to false on non-auth errors - socket.io will retry
        });

        socket.on('new-message', (data: { conversationId: string; message: any }) => {
          if (data.conversationId === conversationId && onNewMessageRef.current) {
            onNewMessageRef.current(data.message);
          }
        });

        socket.on('message-updated', (data: { conversationId: string; message: any }) => {
          if (data.conversationId === conversationId && onMessageUpdateRef.current) {
            onMessageUpdateRef.current(data.message);
          }
        });

        socket.on('message-deleted', (data: { conversationId: string; messageId: string }) => {
          if (data.conversationId === conversationId && onMessageDeleteRef.current) {
            onMessageDeleteRef.current(data.messageId);
          }
        });

        socket.on('user-typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
          if (data.userId !== userId && onUserTypingRef.current) {
            onUserTypingRef.current(data);
          }
        });
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        isConnectingRef.current = false;
      }
    };

    connectSocket();

    return () => {
      isConnectingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      const socket = socketRef.current;
      if (socket && socket.connected) {
        if (conversationId) {
          socket.emit('leave-conversation', { conversationId });
        }
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userId, getToken, conversationId, isSignedIn, skipAuth]);

  // Join/leave conversation
  useEffect(() => {
    if (!socketRef.current || !conversationId || !isConnected) return;

    console.log('📊 useMessagingSocket: Emitting join-conversation', {
      conversationId,
      socketConnected: socketRef.current.connected,
      hasUserId: !!socketRef.current.data?.userId,
    });
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

