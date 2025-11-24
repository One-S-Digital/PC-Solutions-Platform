import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ServiceRequest, ServiceRequestStatus } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { MOCK_ORGANIZATIONS } from '../../constants';

interface ServiceRequestDetailModalProps {
  request: ServiceRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (requestId: string, newStatus: ServiceRequestStatus) => void;
}

const ServiceRequestDetailModal: React.FC<ServiceRequestDetailModalProps> = ({ request, isOpen, onClose, onUpdateStatus }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  if (!isOpen || !request) return null;

  const daycare = MOCK_ORGANIZATIONS.find(org => org.id === request.foundationOrgId);

  const handleViewProfile = () => {
    navigate(`/partner/${request.foundationOrgId}`);
    onClose();
  };

  const renderActions = () => {
    switch (request.status) {
      case ServiceRequestStatus.NEW:
        return (
          <>
            <Button variant="danger" onClick={() => onUpdateStatus(request.id, ServiceRequestStatus.REJECTED)}>Reject</Button>
            <Button variant="primary" onClick={() => onUpdateStatus(request.id, ServiceRequestStatus.ACCEPTED)}>Accept</Button>
          </>
        );
      case ServiceRequestStatus.ACCEPTED:
        return <Button variant="secondary" onClick={() => onUpdateStatus(request.id, ServiceRequestStatus.SCHEDULED)}>Schedule</Button>;
      case ServiceRequestStatus.SCHEDULED:
        return <Button variant="primary" onClick={() => onUpdateStatus(request.id, ServiceRequestStatus.COMPLETED)}>{t("serviceRequestDetailModal.markAsCompleted")}</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('serviceRequestDetailModal.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <span className="block text-xs text-gray-500">{t('serviceRequestDetailModal.requestId')}</span>
            <span className="font-semibold">{request.id}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <span className="block text-xs text-gray-500">{t('serviceRequestDetailModal.serviceName')}</span>
            <span className="font-semibold">{request.serviceName}</span>
          </div>

          <div className="flex items-center p-3 border rounded-md">
            <img src={daycare?.logoUrl} alt={daycare?.name} className="w-10 h-10 rounded-full mr-3"/>
            <div>
              <p className="font-medium">{daycare?.name}</p>
              <p className="text-xs text-gray-500">{daycare?.region}</p>
            </div>
            <Button variant="outline" size="sm" leftIcon={BuildingStorefrontIcon} className="ml-auto" onClick={handleViewProfile}>
              {t('serviceRequestDetailModal.viewDaycareProfile')}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-md"><span className="block text-xs text-gray-500">{t('serviceRequestDetailModal.date')}</span><span className="font-semibold">{new Date(request.requestDate).toLocaleDateString(i18n.language)}</span></div>
            <div className="p-3 bg-gray-50 rounded-md"><span className="block text-xs text-gray-500">{t('serviceRequestDetailModal.status')}</span><span className="font-semibold">{t(`serviceStatus.${request.status.toLowerCase().replace(/\s/g, '')}` as const, request.status)}</span></div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-md">
            <span className="block text-xs text-gray-500">{t('serviceRequestDetailModal.preferredDate')}</span>
            <span className="font-semibold">{request.preferredDate ? new Date(request.preferredDate).toLocaleDateString(i18n.language) : t('serviceRequestDetailModal.noPreferredDate')}</span>
          </div>

          {request.notes && (
            <div>
              <h3 className="font-semibold text-sm mb-1">{t('serviceRequestDetailModal.notes')}</h3>
              <p className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md italic">{request.notes}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <Button type="button" variant="light" onClick={onClose}>{t('common:buttons.close')}</Button>
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestDetailModal;