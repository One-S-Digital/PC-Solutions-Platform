

import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { BellIcon, CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon, TrashIcon, InboxIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, removeNotification } = useNotifications();

  const getNotificationIcon = (type: 'success' | 'info' | 'warning' | 'error') => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'info': return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
      case 'error': return <XCircleIcon className="w-6 h-6 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <BellIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('notificationsPage.title')}
        </h1>
        {notifications.length > 0 && (
          <Button 
            variant="light" 
            size="sm" 
            leftIcon={TrashIcon}
            onClick={() => notifications.forEach(n => removeNotification(n.id))}
            className="mt-4 sm:mt-0"
           >
             {t('notificationsPage.clearAll')}
          </Button>
        )}
      </div>
      
      <Card className="p-4 md:p-6">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('notificationsPage.emptyState.title')}</h2>
            <p className="text-gray-500 mt-1">{t('notificationsPage.emptyState.message')}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map(notif => (
              <li key={notif.id} className="p-4 flex items-start bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 mr-4">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-grow">
                  <Link to={notif.link || '#'} className={`${notif.link ? 'cursor-pointer hover:underline' : 'cursor-default'}`}>
                    <p className="font-semibold text-swiss-charcoal">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                  </Link>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="!p-2 text-gray-400 hover:text-swiss-coral"
                  onClick={() => removeNotification(notif.id)}
                  aria-label={t('buttons.dismiss')}
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;