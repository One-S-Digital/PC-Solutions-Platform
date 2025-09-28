import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  UserGroupIcon, 
  ClipboardDocumentListIcon, 
  BriefcaseIcon, 
  ChartBarIcon,
  PlusIcon,
  ShoppingCartIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { QuickMessage } from '../layout/QuickMessage';
import Card from '../ui/Card';

export function FoundationDashboard() {
  const { user } = useUser();
  const { t } = useTranslation();

  const stats = [
    { 
      name: t('dashboard.enrolled_children'), 
      value: '45 / 50', 
      change: '+2',
      icon: UserGroupIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      name: t('dashboard.available_spots'), 
      value: '5', 
      icon: UserGroupIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      name: t('dashboard.pending_applications'), 
      value: '3', 
      icon: ClipboardDocumentListIcon, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100' 
    },
    { 
      name: t('dashboard.upcoming_appointments'), 
      value: '2', 
      icon: BriefcaseIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'parent_inquiry',
      user: 'S. Dubois',
      description: t('dashboard.new_parent_inquiry'),
      time: '15m ago',
      action: 'View'
    },
    {
      id: 2,
      type: 'job_application',
      user: 'J. Miller',
      description: t('dashboard.new_job_application'),
      time: '1h ago',
      action: 'View'
    },
    {
      id: 3,
      type: 'order_confirmation',
      user: 'EcoToys',
      description: t('dashboard.order_confirmation'),
      time: '3h ago',
      action: 'View'
    },
    {
      id: 4,
      type: 'service_update',
      user: 'ProClean',
      description: t('dashboard.service_update'),
      time: '5h ago',
      action: 'View'
    },
    {
      id: 5,
      type: 'message',
      user: 'T. Fischer',
      description: t('dashboard.new_message_received'),
      time: 'Yesterday',
      action: 'View'
    }
  ];

  const todaySchedule = [
    { time: '10:00', event: t('dashboard.visit_dubois_family') },
    { time: '14:00', event: t('dashboard.interview_miller') },
    { time: '16:30', event: t('dashboard.proclean_service') }
  ];

  const quickActions = [
    { 
      label: t('dashboard.post_new_job'), 
      icon: PlusIcon, 
      path: '/recruitment/job-listings',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      label: t('dashboard.browse_marketplace'), 
      icon: ShoppingCartIcon, 
      path: '/marketplace',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      label: t('dashboard.view_parent_leads'), 
      icon: UserIcon, 
      path: '/parent-leads',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      label: t('dashboard.view_analytics'), 
      icon: ChartBarIcon, 
      path: '/analytics',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.foundation_dashboard')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('dashboard.welcome_message', { name: user?.firstName || 'User' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              {stat.change && (
                <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.recent_activity')}
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span> {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <button className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center space-x-1">
                  <EyeIcon className="h-4 w-4" />
                  <span>{activity.action}</span>
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Today's Schedule */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-lg">☀️</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('dashboard.today_at_glance')}
              </h2>
              <p className="text-sm text-gray-600">18°C</p>
            </div>
          </div>
          <div className="space-y-3">
            {todaySchedule.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900 w-12">{item.time}</span>
                <span className="text-sm text-gray-600 flex-1">{item.event}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.quick_actions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className={`${action.color} text-white p-4 rounded-lg text-center transition-colors`}
              >
                <action.icon className="h-6 w-6 mx-auto mb-2" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Quick Message */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.quick_message')}
          </h2>
          <QuickMessage 
            placeholder={t('dashboard.quick_message_placeholder')}
            onSendMessage={(message) => console.log('Sending message:', message)}
          />
        </Card>
      </div>
    </div>
  );
}