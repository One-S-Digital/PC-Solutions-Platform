import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Service } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatServiceCategoryForService, formatServiceDeliveryType } from '../../utils/serviceFormatting';
import { openExternalUrl } from '../../utils/url';
import servicePlaceholder from '../../assets/service-placeholder.svg';

interface ServiceViewModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestService: (service: Service) => void;
  providerName?: string;
}

const ServiceViewModal: React.FC<ServiceViewModalProps> = ({
  service,
  isOpen,
  onClose,
  onRequestService,
  providerName,
}) => {
  const { t } = useTranslation(['common', 'dashboard', 'profile']);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !service) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleRequest = () => {
    onRequestService(service);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="serviceViewModalTitle"
      onClick={handleBackdropClick}
    >
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl">
        <Card className="bg-white p-0 shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="serviceViewModalTitle" className="text-xl font-semibold text-swiss-charcoal">
            {t('common:serviceViewModal.title', 'Service Details')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label={t('common:buttons.close', 'Close')}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-[160px,1fr] gap-6">
          <div className="w-full">
            <img
              src={service.imageUrl || servicePlaceholder}
              alt={service.title}
              className="w-full h-40 object-cover rounded-lg"
            />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-swiss-charcoal">{service.title}</h3>
              {providerName && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">
                    {t('common:serviceViewModal.providerLabel', 'Provider')}:
                  </span>{' '}
                  {providerName}
                </p>
              )}
            </div>

            {(service.description || service.priceInfo || service.price || service.availability) && (
              <div className="space-y-2 text-sm text-gray-700">
                {service.description && <p className="whitespace-pre-line">{service.description}</p>}
                {service.priceInfo && (
                  <p className="text-swiss-mint font-semibold">{service.priceInfo}</p>
                )}
                {!service.priceInfo && typeof service.price === 'number' && (
                  <p className="text-swiss-mint font-semibold">
                    {t('common:serviceViewModal.priceLabel', 'Price')}: CHF {service.price}
                  </p>
                )}
                {service.availability && (
                  <p>
                    <span className="font-medium text-gray-700">
                      {t('common:serviceViewModal.availabilityLabel', 'Availability')}:
                    </span>{' '}
                    {service.availability}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1">
                {formatServiceCategoryForService(t, service)}
              </span>
              {service.deliveryType && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1">
                  {formatServiceDeliveryType(t, service.deliveryType)}
                </span>
              )}
            </div>

            {service.bookingLink && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openExternalUrl(service.bookingLink)}
              >
                {t('profile:organization.bookService', 'Book Now')}
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button type="button" variant="light" onClick={onClose}>
            {t('common:buttons.close', 'Close')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleRequest}>
            {t('dashboard:partnerDetailPage.requestServiceButton', 'Request Service')}
          </Button>
        </div>
        </Card>
      </div>
    </div>
  );
};

export default ServiceViewModal;
