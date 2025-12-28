import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AppNotification } from '../types'; // AppNotification is defined in types.ts
import { useTranslation } from 'react-i18next';
import { ToastContainer, ToastType } from '../components/ui/Toast';

interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => string; // Returns ID of new notification
  removeNotification: (id: string) => void;
  // Toast notifications (visible on screen)
  showToast: (toast: Omit<ToastNotification, 'id'>) => string;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Define showToast first since addNotification depends on it
  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = { ...toast, id };
    setToasts(prev => [...prev, newToast].slice(-5)); // Keep max 5 toasts
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp'>): string => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    
    // Also show as toast for immediate visibility
    setToasts(prev => [...prev, {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type as ToastType,
      title: notification.title,
      message: notification.message,
      duration: notification.type === 'error' ? 8000 : 5000, // Errors stay longer
    }].slice(-5));
    
    return newNotification.id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const { t } = useTranslation(['dashboard', 'common']);
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(t('notificationContext.useNotificationsError'));
  }
  return context;
};
