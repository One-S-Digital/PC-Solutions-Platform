
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { WrenchScrewdriverIcon, InboxArrowDownIcon, CalendarDaysIcon, StarIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';

const ServiceProviderDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  // Mock data for widgets
  const serviceOverview = {
    activeRequests: '5',
    completedServices: '28',
    upcomingAppointments: '3',
    customerRating: '4.8',
  };

  const serviceManagement = {
    listings: '8',
    pendingApproval: '1',
    categories: ['Cleaning', 'Workshops'],
  };

  const upcomingAppointments = [
    { date: '2024-08-01', foundation: 'KinderWelt Vaud' },
    { date: '2024-08-03', foundation: 'Happy Kids Geneva' },
    { date: '2024-08-05', foundation: 'Little Stars Zurich' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('serviceProviderDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('serviceProviderDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Service Overview Widget */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('serviceProviderDashboard.widgets.overview.title')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('serviceProviderDashboard.widgets.overview.activeRequests')}</span>
              <span className="font-bold text-lg text-swiss-coral">{serviceOverview.activeRequests}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('serviceProviderDashboard.widgets.overview.completedServices')}</span>
              <span className="font-bold text-lg text-swiss-charcoal">{serviceOverview.completedServices}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('serviceProviderDashboard.widgets.overview.upcoming')}</span>
              <span className="font-bold text-lg text-swiss-teal">{serviceOverview.upcomingAppointments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('serviceProviderDashboard.widgets.overview.customerRating')}</span>
              <div className="flex items-center">
                <StarIcon className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                <span className="font-bold text-lg text-swiss-charcoal">{serviceOverview.customerRating}</span>
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-5" onClick={() => navigate('/service-provider/analytics')}>
            {t('serviceProviderDashboard.widgets.overview.button')}
          </Button>
        </Card>

        {/* Service Management Widget */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('serviceProviderDashboard.widgets.management.title')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('serviceProviderDashboard.widgets.management.listings')}</span>
              <span className="font-bold text-lg text-swiss-charcoal">{serviceManagement.listings}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('serviceProviderDashboard.widgets.management.pending')}</span>
              <span className="font-bold text-lg text-yellow-600">{serviceManagement.pendingApproval}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('serviceProviderDashboard.widgets.management.categories')}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {serviceManagement.categories.map(cat => (
                  <span key={cat} className="text-xs bg-swiss-mint/10 text-swiss-mint px-2 py-1 rounded-full">{cat}</span>
                ))}
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" className="w-full mt-5" onClick={() => navigate('/service-provider/service-listings')}>
            {t('serviceProviderDashboard.widgets.management.button')}
          </Button>
        </Card>

        {/* Upcoming Appointments Widget */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
            <CalendarDaysIcon className="w-6 h-6 mr-2 text-swiss-teal"/>
            {t('serviceProviderDashboard.widgets.appointments.title')}
          </h2>
          <ul className="space-y-3">
            {upcomingAppointments.map((appt, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded-md">
                <p className="font-semibold text-swiss-charcoal">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-600">{t('serviceProviderDashboard.widgets.appointments.with', { foundation: appt.foundation })}</p>
              </li>
            ))}
          </ul>
           <Button variant="outline" size="sm" className="w-full mt-5" onClick={() => navigate('/service-provider/requests')}>
            {t('serviceProviderDashboard.widgets.appointments.button')}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ServiceProviderDashboardPage;
