import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  HeartIcon, 
  ClipboardDocumentListIcon, 
  ChatBubbleLeftRightIcon, 
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
  PlusIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';

export function ParentDashboard() {
  const { user } = useUser();
  const { t } = useTranslation();

  const stats = [
    { 
      name: t('dashboard.enquiries_sent'), 
      value: '3', 
      change: '+1',
      icon: HeartIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      name: t('dashboard.responses_received'), 
      value: '2', 
      icon: ChatBubbleLeftRightIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      name: t('dashboard.pending_responses'), 
      value: '1', 
      icon: ClockIcon, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100' 
    },
    { 
      name: t('dashboard.visits_scheduled'), 
      value: '1', 
      icon: CheckCircleIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
  ];

  const recentEnquiries = [
    {
      id: 1,
      daycare: 'Kinderhaus Zürich',
      childAge: '2 years',
      status: 'Response Received',
      sentDate: '2024-01-10',
      responseDate: '2024-01-12'
    },
    {
      id: 2,
      daycare: 'Tagesstätte Bern',
      childAge: '2 years',
      status: 'Under Review',
      sentDate: '2024-01-08',
      responseDate: null
    },
    {
      id: 3,
      daycare: 'Kita Basel',
      childAge: '2 years',
      status: 'Response Received',
      sentDate: '2024-01-05',
      responseDate: '2024-01-07'
    }
  ];

  const upcomingVisits = [
    { 
      date: '2024-01-16', 
      time: '10:00', 
      daycare: 'Kinderhaus Zürich', 
      type: 'In-Person Visit',
      status: 'Confirmed'
    },
    { 
      date: '2024-01-18', 
      time: '14:30', 
      daycare: 'Tagesstätte Bern', 
      type: 'Virtual Tour',
      status: 'Pending'
    }
  ];

  const quickActions = [
    { 
      label: t('dashboard.find_daycare'), 
      icon: PlusIcon, 
      path: '/parent-lead-form',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      label: t('dashboard.view_enquiries'), 
      icon: EyeIcon, 
      path: '/parent/enquiries',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      label: t('dashboard.update_profile'), 
      icon: BuildingOfficeIcon, 
      path: '/profile',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      label: t('dashboard.messages'), 
      icon: ChatBubbleLeftRightIcon, 
      path: '/messages',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Response Received': return 'text-green-600 bg-green-100';
      case 'Under Review': return 'text-blue-600 bg-blue-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Confirmed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.parent_dashboard')}
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
        {/* Recent Enquiries */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.recent_enquiries')}
          </h2>
          <div className="space-y-4">
            {recentEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{enquiry.daycare}</p>
                  <p className="text-xs text-gray-600">Child: {enquiry.childAge}</p>
                  <p className="text-xs text-gray-500 mt-1">Sent: {enquiry.sentDate}</p>
                  {enquiry.responseDate && (
                    <p className="text-xs text-green-600">Response: {enquiry.responseDate}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(enquiry.status)}`}>
                    {enquiry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Visits */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.upcoming_visits')}
            </h2>
          </div>
          <div className="space-y-3">
            {upcomingVisits.map((visit, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500">{visit.date}</p>
                  <p className="text-sm font-medium text-gray-900">{visit.time}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{visit.daycare}</p>
                  <p className="text-xs text-gray-600">{visit.type}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(visit.status)}`}>
                    {visit.status}
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