import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  WrenchScrewdriverIcon, 
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  PlusIcon,
  ClockIcon,
  BuildingOfficeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';

export function ServiceProviderDashboard() {
  const { user } = useUser();
  const { t } = useTranslation();

  const stats = [
    { 
      name: t('dashboard.active_requests'), 
      value: '18', 
      change: '+3',
      icon: ClipboardDocumentListIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      name: t('dashboard.completed_services'), 
      value: '142', 
      change: '+15',
      icon: CheckCircleIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      name: t('dashboard.total_revenue'), 
      value: 'CHF 28,450', 
      change: '+8%',
      icon: CurrencyDollarIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
    { 
      name: t('dashboard.avg_rating'), 
      value: '4.8', 
      icon: ChartBarIcon, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100' 
    },
  ];

  const recentRequests = [
    {
      id: 1,
      customer: 'Kinderhaus Zürich',
      service: 'Deep Cleaning',
      date: '2024-01-15',
      time: '09:00',
      status: 'Scheduled',
      amount: 'CHF 350'
    },
    {
      id: 2,
      customer: 'Tagesstätte Bern',
      service: 'Maintenance Check',
      date: '2024-01-16',
      time: '14:00',
      status: 'Pending',
      amount: 'CHF 200'
    },
    {
      id: 3,
      customer: 'Kita Basel',
      service: 'Equipment Repair',
      date: '2024-01-14',
      time: '10:30',
      status: 'Completed',
      amount: 'CHF 180'
    },
    {
      id: 4,
      customer: 'Crèche Genève',
      service: 'Safety Inspection',
      date: '2024-01-17',
      time: '11:00',
      status: 'Confirmed',
      amount: 'CHF 280'
    }
  ];

  const upcomingAppointments = [
    { time: '09:00', service: 'Deep Cleaning - Kinderhaus Zürich', status: 'Scheduled' },
    { time: '14:00', service: 'Maintenance Check - Tagesstätte Bern', status: 'Pending' },
    { time: '16:30', service: 'Safety Inspection - Crèche Genève', status: 'Confirmed' }
  ];

  const quickActions = [
    { 
      label: t('dashboard.add_new_service'), 
      icon: PlusIcon, 
      path: '/service-provider/service-listings',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      label: t('dashboard.view_requests'), 
      icon: ClipboardDocumentListIcon, 
      path: '/service-provider/requests',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      label: t('dashboard.update_profile'), 
      icon: BuildingOfficeIcon, 
      path: '/service-provider/profile',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      label: t('dashboard.view_analytics'), 
      icon: ChartBarIcon, 
      path: '/service-provider/analytics',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'text-blue-600 bg-blue-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Confirmed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.service_provider_dashboard')}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.recent_requests')}
          </h2>
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{request.customer}</p>
                  <p className="text-xs text-gray-600">{request.service}</p>
                  <p className="text-xs text-gray-500 mt-1">{request.date} at {request.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{request.amount}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.upcoming_appointments')}
            </h2>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.map((appointment, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900 w-12">{appointment.time}</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">{appointment.service}</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
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