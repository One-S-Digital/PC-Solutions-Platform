import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { MOCK_ORGANIZATIONS } from '../../constants';
import { ServiceRequest, ServiceRequestStatus } from '../../types';
import Button from '../../components/ui/Button';
import ServiceRequestDetailModal from '../../components/service-provider/ServiceRequestDetailModal';
import { InboxIcon } from '@heroicons/react/24/outline';

const ServiceProviderRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, serviceRequests: allRequests } = useAppContext();
  const [requests, setRequests] = useState(allRequests);
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | 'All'>('All');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const myRequests = useMemo(() => {
    return requests.filter(req => req.providerId === currentUser?.orgId);
  }, [requests, currentUser?.orgId]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'All') return myRequests;
    return myRequests.filter(req => req.status === statusFilter);
  }, [myRequests, statusFilter]);

  const requestStatuses: (ServiceRequestStatus | 'All')[] = ['All', ...Object.values(ServiceRequestStatus)];

  const getFoundationName = (orgId: string) => {
    return MOCK_ORGANIZATIONS.find(o => o.id === orgId)?.name || t('foundationOrdersAppointmentsPage.unknownProvider');
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

  const handleUpdateStatus = (requestId: string, newStatus: ServiceRequestStatus) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    ));
    setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
    alert(`Request ${requestId} updated to ${newStatus}.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal">{t('serviceProviderRequestsPage.title')}</h1>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">{t('serviceProviderRequestsPage.filterByStatus')}:</span>
            {requestStatuses.map(status => (
                <Button 
                    key={status} 
                    variant={statusFilter === status ? 'secondary' : 'light'} 
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                >
                    {status === 'All' ? t('messagesPage.filters.all') : t(`serviceStatus.${status.toLowerCase().replace(/\s/g, '')}` as const, status)}
                </Button>
            ))}
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceProviderRequestsPage.table.requestId')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceProviderRequestsPage.table.foundation')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceProviderRequestsPage.table.service')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceProviderRequestsPage.table.date')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceProviderRequestsPage.table.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRequest(req)}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-teal">{req.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getFoundationName(req.foundationOrgId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.serviceName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.requestDate).toLocaleDateString()}</td>
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
              {t('serviceProviderRequestsPage.emptyState')}
            </div>
          )}
        </div>
      </Card>
      <ServiceRequestDetailModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default ServiceProviderRequestsPage;