import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  UsersIcon, 
  ChartBarIcon, 
  CogIcon, 
  ShieldCheckIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  PlusIcon,
  UserGroupIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';

export function AdminDashboard() {
  const { user } = useUser();
  const { t } = useTranslation();

  const stats = [
    { 
      name: t('dashboard.total_users'), 
      value: '1,247', 
      change: '+23',
      icon: UsersIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      name: t('dashboard.active_organizations'), 
      value: '89', 
      change: '+5',
      icon: BuildingOfficeIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      name: t('dashboard.total_orders'), 
      value: '2,156', 
      change: '+12%',
      icon: ClipboardDocumentListIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
    { 
      name: t('dashboard.system_health'), 
      value: '99.9%', 
      icon: ShieldCheckIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'user_registration',
      user: 'Maria Schmidt',
      action: 'registered as Foundation',
      time: '15m ago',
      status: 'New'
    },
    {
      id: 2,
      type: 'organization_created',
      user: 'EcoToys GmbH',
      action: 'created organization profile',
      time: '1h ago',
      status: 'Verified'
    },
    {
      id: 3,
      type: 'order_placed',
      user: 'Kinderhaus Zürich',
      action: 'placed order #ORD124',
      time: '2h ago',
      status: 'Processing'
    },
    {
      id: 4,
      type: 'content_upload',
      user: 'Admin User',
      action: 'uploaded HR document',
      time: '3h ago',
      status: 'Published'
    },
    {
      id: 5,
      type: 'system_update',
      user: 'System',
      action: 'performed maintenance',
      time: '5h ago',
      status: 'Completed'
    }
  ];

  const systemMetrics = [
    { name: 'CPU Usage', value: '45%', status: 'Normal' },
    { name: 'Memory Usage', value: '67%', status: 'Normal' },
    { name: 'Database Connections', value: '23/100', status: 'Normal' },
    { name: 'API Response Time', value: '120ms', status: 'Good' }
  ];

  const quickActions = [
    { 
      label: t('dashboard.manage_users'), 
      icon: UsersIcon, 
      path: '/admin/users',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      label: t('dashboard.content_management'), 
      icon: DocumentTextIcon, 
      path: '/admin/content',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      label: t('dashboard.system_settings'), 
      icon: CogIcon, 
      path: '/admin/settings',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      label: t('dashboard.view_analytics'), 
      icon: ChartBarIcon, 
      path: '/admin/analytics',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'text-blue-600 bg-blue-100';
      case 'Verified': return 'text-green-600 bg-green-100';
      case 'Processing': return 'text-yellow-600 bg-yellow-100';
      case 'Published': return 'text-purple-600 bg-purple-100';
      case 'Completed': return 'text-gray-600 bg-gray-100';
      case 'Normal': return 'text-green-600 bg-green-100';
      case 'Good': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.admin_dashboard')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('dashboard.welcome_message', { name: user?.firstName || 'Admin' })}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.recent_activity')}
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                  <p className="text-xs text-gray-600">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* System Metrics */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheckIcon className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.system_metrics')}
            </h2>
          </div>
          <div className="space-y-3">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-900">{metric.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{metric.value}</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(metric.status)}`}>
                    {metric.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
    </div>
  );
}