import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

interface UseSupportSocketOptions {
  ticketId: string | null;
  userId: string;
  onNewReply?: (reply: any) => void;
  onTicketUpdate?: (ticket: any) => void;
}

export function useSupportSocket({
  ticketId,
  userId,
  onNewReply,
  onTicketUpdate,
}: UseSupportSocketOptions) {
  const { getToken, isSignedIn } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = useRef<boolean>(false);
  const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';
  
  // Store callbacks in refs to avoid recreating socket on callback changes
  const onNewReplyRef = useRef(onNewReply);
  const onTicketUpdateRef = useRef(onTicketUpdate);
  
  useEffect(() => {
    onNewReplyRef.current = onNewReply;
    onTicketUpdateRef.current = onTicketUpdate;
  });

  useEffect(() => {
    // Only create socket if we have ticketId and userId
    if (!ticketId || !userId) {
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
          
          if (!token && isSignedIn) {
            await new Promise(resolve => setTimeout(resolve, 500));
            token = await getToken();
          }
          
          if (!token && isSignedIn) {
            console.warn('⚠️ Support WebSocket: Token not available after retry.');
            isConnectingRef.current = false;
            return;
          } else if (!token) {
            console.warn('⚠️ Support WebSocket: No token available and user not signed in.');
            isConnectingRef.current = false;
            return;
          }
        }

        // Construct WebSocket URL
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const baseUrl = rawApiUrl.replace(/\/api\/?$/, '');
        const socketUrl = `${baseUrl}/support`;
        
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
          if (import.meta.env.DEV) {
            console.log('✅ Support WebSocket connected');
          }
        });

        socket.on('disconnect', (reason) => {
          setIsConnected(false);
          if (reason !== 'io client disconnect' && import.meta.env.DEV) {
            console.log('❌ Support WebSocket disconnected:', reason);
          }
        });

        socket.on('connect_error', (error) => {
          const errorMsg = error.message.toLowerCase();
          const isAuthError = !skipAuth && (
            errorMsg.includes('missing token') ||
            errorMsg.includes('invalid token') ||
            errorMsg.includes('unauthorized')
          );
          
          if (isAuthError) {
            setIsConnected(false);
            socket.disconnect();
            socketRef.current = null;
            isConnectingRef.current = false;
            console.warn('⚠️ Support WebSocket: Authentication failed.');
            return;
          }
        });

        socket.on('supportTicket:replyCreated', (data: { ticketId: string; reply: any }) => {
          if (data.ticketId === ticketId && onNewReplyRef.current) {
            onNewReplyRef.current(data.reply);
          }
        });

        socket.on('supportTicket:ticketUpdated', (data: { ticketId: string; ticket: any }) => {
          if (data.ticketId === ticketId && onTicketUpdateRef.current) {
            onTicketUpdateRef.current(data.ticket);
          }
        });
      } catch (error) {
        console.error('Failed to create Support WebSocket connection:', error);
        isConnectingRef.current = false;
      }
    };

    connectSocket();

    return () => {
      isConnectingRef.current = false;
      const socket = socketRef.current;
      if (socket && socket.connected) {
        if (ticketId) {
          socket.emit('leave-ticket', { ticketId });
        }
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userId, getToken, ticketId, isSignedIn, skipAuth]);

  // Join/leave ticket room
  useEffect(() => {
    if (!socketRef.current || !ticketId || !isConnected) return;

    socketRef.current.emit('join-ticket', { ticketId });
    if (import.meta.env.DEV) {
      console.log(`✅ Joined ticket ${ticketId} via WebSocket`);
    }

    return () => {
      if (socketRef.current && ticketId) {
        socketRef.current.emit('leave-ticket', { ticketId });
        if (import.meta.env.DEV) {
          console.log(`👋 Left ticket ${ticketId} via WebSocket`);
        }
      }
    };
  }, [ticketId, isConnected]);

  return {
    isConnected,
  };
}

