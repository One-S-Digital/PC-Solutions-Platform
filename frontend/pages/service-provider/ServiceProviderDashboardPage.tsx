import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { WrenchScrewdriverIcon, CalendarDaysIcon, StarIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ServiceProviderStats {
  activeRequests: number;
  completedServices: number;
  upcomingAppointments: number;
  customerRating: number;
  totalServices: number;
  activeServices: number;
  pendingApproval: number;
  categories: string[];
  totalBookings: number;
  monthlyRevenue: number;
  activeClients: number;
  pendingBookings: number;
  averageRating: number;
}

interface Booking {
  id: string;
  clientName: string;
  clientOrgId: string;
  serviceId: string;
  serviceType: string;
  serviceTitle: string;
  description?: string;
  scheduledDate: string | null;
  requestedDate: string;
  createdAt: string;
  duration: number;
  totalAmount: number;
  status: string;
}

const ServiceProviderDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();

  const [stats, setStats] = useState<ServiceProviderStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser?.orgId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch stats and upcoming bookings in parallel
      const [statsRes, bookingsRes] = await Promise.all([
        authenticatedRequest<ServiceProviderStats>('/dashboard/service-provider/stats'),
        authenticatedRequest<Booking[]>('/dashboard/service-provider/bookings?upcoming=true&limit=5'),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (bookingsRes.success && bookingsRes.data) {
        setUpcomingAppointments(bookingsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch service provider dashboard data:', err);
      setError(t('serviceProviderDashboard.loadError', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.orgId, authenticatedRequest, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData}>{t('common:retry', 'Retry')}</Button>
      </div>
    );
  }

  // Prepare display data from stats
  const serviceOverview = {
    activeRequests: stats?.activeRequests?.toString() || '0',
    completedServices: stats?.completedServices?.toString() || '0',
    upcomingAppointments: stats?.upcomingAppointments?.toString() || '0',
    customerRating: stats?.customerRating ? stats.customerRating.toFixed(1) : 'N/A',
  };

  const serviceManagement = {
    listings: stats?.activeServices?.toString() || '0',
    pendingApproval: stats?.pendingApproval?.toString() || '0',
    categories: stats?.categories || [],
  };

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
                {serviceManagement.categories.length > 0 ? (
                  serviceManagement.categories.slice(0, 5).map(cat => (
                    <span key={cat} className="text-xs bg-swiss-mint/10 text-swiss-mint px-2 py-1 rounded-full">{cat}</span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">{t('serviceProviderDashboard.widgets.management.noCategories', 'No categories yet')}</span>
                )}
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
          {upcomingAppointments.length > 0 ? (
            <ul className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <li key={appt.id} className="p-3 bg-gray-50 rounded-md">
                  <p className="font-semibold text-swiss-charcoal">
                    {appt.scheduledDate 
                      ? new Date(appt.scheduledDate).toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })
                      : t('serviceProviderDashboard.widgets.appointments.notScheduled', 'Not scheduled yet')
                    }
                  </p>
                  <p className="text-sm text-gray-600">{t('serviceProviderDashboard.widgets.appointments.with', { foundation: appt.clientName })}</p>
                  <p className="text-xs text-swiss-teal mt-1">{appt.serviceTitle}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">{t('serviceProviderDashboard.widgets.appointments.noAppointments', 'No upcoming appointments')}</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full mt-5" onClick={() => navigate('/service-provider/requests')}>
            {t('serviceProviderDashboard.widgets.appointments.button')}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ServiceProviderDashboardPage;
