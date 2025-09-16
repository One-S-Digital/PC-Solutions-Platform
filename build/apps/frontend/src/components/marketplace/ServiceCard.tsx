import React from 'react';
import { SwissCard, SwissButton, Badge } from '@repo/ui';
import { Service } from '../../services/marketplaceService';
import { useTranslation } from 'react-i18next';

interface ServiceCardProps {
  service: Service;
  onRequestService?: (serviceId: string) => void;
}

export function ServiceCard({ service, onRequestService }: ServiceCardProps) {
  const { t } = useTranslation();

  const formatPrice = (price?: number) => {
    if (!price) return t('marketplace.priceOnRequest', 'Price on request');
    return `CHF ${price.toFixed(2)}`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      CLEANING: 'bg-blue-100 text-blue-800',
      IT_SUPPORT: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      CONSULTING: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-pink-100 text-pink-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.OTHER;
  };

  return (
    <SwissCard className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Service Icon */}
      <div className="aspect-square bg-surface-2 rounded-lg mb-4 flex items-center justify-center">
        <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Service Info */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-semibold text-text-default line-clamp-2">
            {service.title}
          </h3>
          <Badge 
            variant="info" 
            className={`mt-1 ${getCategoryColor(service.category)}`}
          >
            {t(`marketplace.serviceCategory.${service.category}`, service.category)}
          </Badge>
        </div>

        {service.description && (
          <p className="text-sm text-text-secondary line-clamp-3 mb-4">
            {service.description}
          </p>
        )}

        {/* Provider Info */}
        {service.provider?.organization && (
          <div className="text-xs text-text-secondary mb-4">
            {t('marketplace.provider', 'Provider')}: {service.provider.organization.name}
          </div>
        )}

        {/* Price and Actions */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-text-default">
              {formatPrice(service.price)}
            </span>
            {!service.isActive && (
              <Badge variant="error">
                {t('marketplace.inactive', 'Inactive')}
              </Badge>
            )}
          </div>

          <SwissButton
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onRequestService?.(service.id)}
            disabled={!service.isActive}
          >
            {t('marketplace.requestService', 'Request Service')}
          </SwissButton>
        </div>
      </div>
    </SwissCard>
  );
}