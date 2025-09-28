import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  BriefcaseIcon, 
  ClipboardDocumentCheckIcon, 
  UserIcon, 
  AcademicCapIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';

export function EducatorDashboard() {
  const { user } = useUser();
  const { t } = useTranslation();

  const stats = [
    { 
      name: t('dashboard.applications_submitted'), 
      value: '8', 
      change: '+2',
      icon: ClipboardDocumentCheckIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      name: t('dashboard.applications_viewed'), 
      value: '5', 
      icon: EyeIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      name: t('dashboard.interviews_scheduled'), 
      value: '3', 
      icon: ClockIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
    { 
      name: t('dashboard.profile_completion'), 
      value: '95%', 
      icon: UserIcon, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100' 
    },
  ];

  const recentApplications = [
    {
      id: 1,
      position: 'Lead Educator',
      organization: 'Kinderhaus Zürich',
      status: 'Under Review',
      appliedDate: '2024-01-10',
      salary: 'CHF 4,500'
    },
    {
      id: 2,
      position: 'Early Childhood Teacher',
      organization: 'Tagesstätte Bern',
      status: 'Interview Scheduled',
      appliedDate: '2024-01-08',
      salary: 'CHF 4,200'
    },
    {
      id: 3,
      position: 'Kindergarten Teacher',
      organization: 'Kita Basel',
      status: 'Application Viewed',
      appliedDate: '2024-01-05',
      salary: 'CHF 4,000'
    },
    {
      id: 4,
      position: 'Childcare Assistant',
      organization: 'Crèche Genève',
      status: 'Rejected',
      appliedDate: '2024-01-03',
      salary: 'CHF 3,800'
    }
  ];

  const upcomingInterviews = [
    { 
      date: '2024-01-16', 
      time: '10:00', 
      position: 'Lead Educator', 
      organization: 'Kinderhaus Zürich',
      type: 'Video Call'
    },
    { 
      date: '2024-01-18', 
      time: '14:30', 
      position: 'Early Childhood Teacher', 
      organization: 'Tagesstätte Bern',
      type: 'In-Person'
    },
    { 
      date: '2024-01-20', 
      time: '09:15', 
      position: 'Kindergarten Teacher', 
      organization: 'Kita Basel',
      type: 'Video Call'
    }
  ];

  const quickActions = [
    { 
      label: t('dashboard.search_jobs'), 
      icon: BriefcaseIcon, 
      path: '/educator/job-board',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      label: t('dashboard.update_profile'), 
      icon: UserIcon, 
      path: '/educator/profile',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      label: t('dashboard.view_applications'), 
      icon: ClipboardDocumentCheckIcon, 
      path: '/educator/applications',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      label: t('dashboard.e_learning'), 
      icon: AcademicCapIcon, 
      path: '/e-learning',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Under Review': return 'text-blue-600 bg-blue-100';
      case 'Interview Scheduled': return 'text-green-600 bg-green-100';
      case 'Application Viewed': return 'text-purple-600 bg-purple-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.educator_dashboard')}
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
        {/* Recent Applications */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.recent_applications')}
          </h2>
          <div className="space-y-4">
            {recentApplications.map((application) => (
              <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{application.position}</p>
                  <p className="text-xs text-gray-600">{application.organization}</p>
                  <p className="text-xs text-gray-500 mt-1">Applied: {application.appliedDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{application.salary}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                    {application.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Interviews */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.upcoming_interviews')}
            </h2>
          </div>
          <div className="space-y-3">
            {upcomingInterviews.map((interview, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500">{interview.date}</p>
                  <p className="text-sm font-medium text-gray-900">{interview.time}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{interview.position}</p>
                  <p className="text-xs text-gray-600">{interview.organization}</p>
                  <p className="text-xs text-gray-500">{interview.type}</p>
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