
import React from 'react';
import { useInAppNotifications } from '../contexts/InAppNotificationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  BellIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ArrowPathIcon,
  InboxIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const getNotificationIcon = (type: string) => {
  if (type.startsWith('REPLACEMENT')) return <ArrowPathIcon className="w-5 h-5 text-swiss-teal" />;
  if (type.startsWith('JOB') || type.startsWith('APPLICATION')) return <BriefcaseIcon className="w-5 h-5 text-swiss-mint" />;
  if (type.startsWith('INTERN')) return <UserGroupIcon className="w-5 h-5 text-blue-500" />;
  return <BellIcon className="w-5 h-5 text-gray-400" />;
};

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { notifications, isLoading, markRead, markAllRead } = useInAppNotifications();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <BellIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('notificationsPage.title')}
        </h1>
        {unreadCount > 0 && (
          <Button
            variant="light"
            size="sm"
            leftIcon={CheckIcon}
            onClick={markAllRead}
            className="mt-4 sm:mt-0"
          >
            {t('notificationsPage.markAllRead', 'Mark all as read')}
          </Button>
        )}
      </div>

      <Card className="p-4 md:p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">{t('common:loading', 'Loading…')}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('notificationsPage.emptyState.title')}</h2>
            <p className="text-gray-500 mt-1">{t('notificationsPage.emptyState.message')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map(notif => (
              <li
                key={notif.id}
                className={`p-4 flex items-start rounded-lg transition-colors ${notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}
              >
                <div className="flex-shrink-0 mr-3 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-grow min-w-0">
                  {notif.link ? (
                    <Link to={notif.link} className="hover:underline" onClick={() => !notif.read && markRead(notif.id)}>
                      <p className={`${notif.read ? 'font-semibold' : 'font-bold'} text-swiss-charcoal truncate`}>{notif.title}</p>
                    </Link>
                  ) : (
                    <p className={`${notif.read ? 'font-semibold' : 'font-bold'} text-swiss-charcoal truncate`}>{notif.title}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-0.5">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => markRead(notif.id)}
                    className="flex-shrink-0 ml-3 mt-0.5 p-1 rounded text-swiss-teal hover:text-swiss-mint"
                    aria-label={t('common:buttons.markRead', 'Mark as read')}
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
