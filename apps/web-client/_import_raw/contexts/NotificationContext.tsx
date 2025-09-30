import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AppNotification } from '../types'; // AppNotification is defined in types.ts

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => string; // Returns ID of new notification
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp'>): string => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    
    // Optional: auto-remove after some time for certain types
    if (notification.type === 'success' || notification.type === 'info') {
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, 5000); // Auto-remove after 5 seconds
    }
    return newNotification.id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
