import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { ServiceRequest, ServiceRequestStatus, Organization } from '../../types';
import Button from '../../components/ui/Button';
import ServiceRequestDetailModal from '../../components/service-provider/ServiceRequestDetailModal';
import { InboxIcon } from '@heroicons/react/24/outline';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ServiceProviderRequestsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { currentUser, serviceRequests: contextRequests, serviceRequestsLoading, refreshServiceRequests } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | 'All'>('All');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const response = await authenticatedRequest<Organization[]>('/compat/organizations');
      if (response.success && response.data) {
        setOrganizations(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setOrgsLoading(false);
    }
  }, [authenticatedRequest]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const myRequests = useMemo(() => {
    return contextRequests.filter(req => req.providerId === currentUser?.orgId);
  }, [contextRequests, currentUser?.orgId]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'All') return myRequests;
    return myRequests.filter(req => req.status === statusFilter);
  }, [myRequests, statusFilter]);

  const requestStatuses: (ServiceRequestStatus | 'All')[] = ['All', ...Object.values(ServiceRequestStatus)];

  const getFoundationName = (orgId: string) => {
    return organizations.find(o => o.id === orgId)?.name || t('foundationOrdersAppointmentsPage.unknownProvider');
  };

  const getStatusClass = (status: ServiceRequestStatus) => {
    switch (status) {
      case ServiceRequestStatus.NEW: return 'bg-swiss-coral/20 text-swiss-coral';
      case ServiceRequestStatus.IN_REVIEW: return 'bg-swiss-sand/30 text-amber-700';
      case ServiceRequestStatus.ACCEPTED:
      case ServiceRequestStatus.SCHEDULED:
         return 'bg-swiss-mint/20 text-swiss-mint';
      case ServiceRequestStatus.COMPLETED: return 'bg-swiss-mint text-white';
      case ServiceRequestStatus.REJECTED:
      case ServiceRequestStatus.CANCELLED:
        return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: ServiceRequestStatus) => {
    try {
      const response = await authenticatedRequest<ServiceRequest>(`/marketplace/service-requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.success) {
        // Refresh the requests from context
        await refreshServiceRequests();
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update request status:', err);
      alert(t('dashboard:serviceProviderRequestsPage.updateError', 'Failed to update request status'));
    }
  };

  const loading = serviceRequestsLoading || orgsLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal">{t('dashboard:serviceProviderRequestsPage.title')}</h1>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">{t('dashboard:serviceProviderRequestsPage.filterByStatus')}:</span>
            {requestStatuses.map(status => (
                <Button 
                    key={status} 
                    variant={statusFilter === status ? 'secondary' : 'light'} 
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                >
                    {status === 'All' ? t('common:filters.all') : t(`serviceStatus.${status.toLowerCase().replace(/\s/g, '')}` as const, status)}
                </Button>
            ))}
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:serviceProviderRequestsPage.table.requestId')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:serviceProviderRequestsPage.table.foundation')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:serviceProviderRequestsPage.table.service')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:serviceProviderRequestsPage.table.date')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:serviceProviderRequestsPage.table.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRequest(req)}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-teal">{req.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getFoundationName(req.foundationOrgId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.serviceName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.requestDate).toLocaleDateString(i18n.language)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(req.status)}`}>
                      {t(`serviceStatus.${req.status.toLowerCase().replace(/\s/g, '')}` as const, req.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRequests.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              {t('dashboard:serviceProviderRequestsPage.emptyState')}
            </div>
          )}
        </div>
      </Card>
      <ServiceRequestDetailModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onUpdateStatus={handleUpdateStatus}
        organizations={organizations}
      />
    </div>
  );
};

export default ServiceProviderRequestsPage;
