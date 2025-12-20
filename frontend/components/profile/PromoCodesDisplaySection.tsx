import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface PromoCode {
  id: string;
  code: string;
  discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes';
  value: number;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Disabled';
  description?: string;
  usageCount: number;
  maxUsage?: number;
}

interface PromoCodesDisplaySectionProps {
  organizationId?: string;
  isOwnProfile?: boolean;
}

const PromoCodesDisplaySection: React.FC<PromoCodesDisplaySectionProps> = ({
  organizationId,
  isOwnProfile = false,
}) => {
  // Keep `common` first so un-namespaced keys resolve correctly.
  const { t, i18n } = useTranslation(['common', 'settings']);
  const { request } = useAuthenticatedApi();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadPromoCodes();
  }, [organizationId, isOwnProfile]);

  const loadPromoCodes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let endpoint = '/promo-codes';
      
      // If viewing someone else's profile, use the public endpoint
      if (!isOwnProfile && organizationId) {
        endpoint = `/promo-codes/public/${organizationId}`;
      }

      const response = await request<{ success: boolean; data: PromoCode[] }>(endpoint);
      
      if (response && (response as any).success && (response as any).data) {
        setPromoCodes((response as any).data);
      } else {
        setPromoCodes([]);
      }
    } catch (err) {
      console.error('Failed to load promo codes', err);
      setError(t('common:errors.genericErrorMessage', 'Failed to load promo codes'));
      setPromoCodes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const getDiscountText = (promo: PromoCode) => {
    switch (promo.discountType) {
      case 'Percentage':
        return t('settingsPromoCodeManager.discountTypes.percentage', { value: promo.value });
      case 'FixedAmount':
        return t('settingsPromoCodeManager.discountTypes.fixedAmount', { value: promo.value });
      case 'FreeMinutes':
        return t('settingsPromoCodeManager.discountTypes.freeMinutes', { value: promo.value });
      default:
        return `${promo.value}`;
    }
  };

  const getStatusLabel = (status: PromoCode['status']) => {
    switch (status) {
      case 'Active':
        return t('settingsPromoCodeManager.status.active');
      case 'Disabled':
        return t('settingsPromoCodeManager.status.disabled');
      case 'Expired':
        return t('settingsPromoCodeManager.status.expired');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language || 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Expired':
        return 'bg-red-100 text-red-700';
      case 'Disabled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter to show only active codes for non-owners
  const displayCodes = isOwnProfile 
    ? promoCodes 
    : promoCodes.filter(code => code.status === 'Active');

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="h-5 w-5 text-swiss-mint" />
          <h3 className="text-lg font-semibold text-swiss-charcoal">
            {t('settings:page.promoCodeManager')}
          </h3>
        </div>
        <LoadingSpinner text={t('common:loading')} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="h-5 w-5 text-swiss-mint" />
          <h3 className="text-lg font-semibold text-swiss-charcoal">
            {t('settings:page.promoCodeManager')}
          </h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <Button variant="light" size="sm" leftIcon={ArrowPathIcon} onClick={loadPromoCodes}>
            {t('common:buttons.retry')}
          </Button>
        </div>
      </Card>
    );
  }

  if (displayCodes.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="h-5 w-5 text-swiss-mint" />
          <h3 className="text-lg font-semibold text-swiss-charcoal">
            {t('settings:page.promoCodeManager')}
          </h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">
          {isOwnProfile 
            ? t('settingsPromoCodeManager.noCodesYet')
            : t('promoCodesDisplay.noActivePromoCodes')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-swiss-mint" />
          <h3 className="text-lg font-semibold text-swiss-charcoal">
            {t('settings:page.promoCodeManager')}
          </h3>
        </div>
        {isOwnProfile && (
          <Button variant="light" size="sm" leftIcon={ArrowPathIcon} onClick={loadPromoCodes}>
            {t('common:buttons.refresh')}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {displayCodes.map((promo) => (
          <div
            key={promo.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-swiss-charcoal bg-white px-3 py-1 rounded border border-gray-200">
                  {promo.code}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClasses(promo.status)}`}>
                  {getStatusLabel(promo.status)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="font-medium text-swiss-mint">{getDiscountText(promo)}</span>
                <span>
                  {t('promoCodesDisplay.expiresOn')}: {formatDate(promo.expiryDate)}
                </span>
                {promo.description && (
                  <span className="text-gray-500">{promo.description}</span>
                )}
                {isOwnProfile && promo.maxUsage && (
                  <span className="text-gray-500">
                    {t('promoCodesDisplay.usageCount')}: {promo.usageCount}/{promo.maxUsage}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={copiedCode === promo.code ? CheckIcon : ClipboardIcon}
              onClick={() => copyToClipboard(promo.code)}
              className={copiedCode === promo.code ? 'text-green-600 border-green-600' : ''}
            >
              {copiedCode === promo.code 
                ? t('common:buttons.copied')
                : t('common:buttons.copy')}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PromoCodesDisplaySection;
