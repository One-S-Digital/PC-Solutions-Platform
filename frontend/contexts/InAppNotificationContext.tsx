import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { notificationsApiService, InAppNotification } from '../services/notificationsService';
import { useAppContext } from './AppContext';

interface InAppNotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const InAppNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const data = await notificationsApiService.getMyNotifications();
      setNotifications(data);
    } catch {
      // silently fail — bell is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const markRead = useCallback(async (id: string) => {
    await notificationsApiService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApiService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Initial fetch
  useEffect(() => {
    if (currentUser) refresh();
  }, [currentUser, refresh]);

  // Socket.IO connection — authenticated with Clerk JWT
  useEffect(() => {
    if (!currentUser) return;

    let active = true;

    const connect = async () => {
      let token: string | null = null;
      try {
        token = await getToken();
      } catch {
        // Clerk not ready yet; the effect will re-run when currentUser changes
        return;
      }

      if (!token || !active) return;

      const socket = io(`${API_BASE}/notifications`, {
        auth: { token },
        // Reconnection is handled by socket.io-client automatically
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: Infinity,
        transports: ['websocket'],
      });

      socketRef.current = socket;

      socket.on('notification', (data: InAppNotification) => {
        setNotifications(prev => [data, ...prev]);
      });

      socket.on('connect_error', () => {
        // Token may have expired — refresh it on next reconnect attempt
        socket.auth = {};
        getToken().then(t => {
          if (t) socket.auth = { token: t };
        }).catch(() => {});
      });
    };

    connect();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, getToken]);

  return (
    <InAppNotificationContext.Provider value={{ notifications, unreadCount, isLoading, refresh, markRead, markAllRead }}>
      {children}
    </InAppNotificationContext.Provider>
  );
};

export const useInAppNotifications = () => {
  const ctx = useContext(InAppNotificationContext);
  if (!ctx) throw new Error('useInAppNotifications must be used within InAppNotificationProvider');
  return ctx;
};
