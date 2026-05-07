import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
// WebSocket base is the same host/port as the API
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export const InAppNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

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

  // WebSocket connection for real-time push
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.id;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_BASE}/notifications?userId=${encodeURIComponent(userId)}`);
        socketRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.event === 'notification' && data?.data) {
              setNotifications(prev => [data.data as InAppNotification, ...prev]);
            }
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          // Reconnect after 5 s
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
      socketRef.current = null;
    };
  }, [currentUser]);

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
