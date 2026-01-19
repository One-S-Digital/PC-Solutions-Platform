import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../contexts/NotificationContext';
import AddPromoCodeModal, { PromoCodeData, PromoCodeFormData } from '../settings/AddPromoCodeModal';

interface PromoCodesApiResponse {
  success: boolean;
  data?: PromoCodeData[];
  hasOrganization?: boolean;
  message?: string;
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
  const { addNotification } = useNotifications();
  const [promoCodes, setPromoCodes] = useState<PromoCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadPromoCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (isOwnProfile) {
      setHasOrganization(null);
    }

    try {
      let endpoint = '/promo-codes';
      
      // If viewing someone else's profile, use the public endpoint
      if (!isOwnProfile && organizationId) {
        endpoint = `/promo-codes/public/${organizationId}`;
      }

      const response = await request<PromoCodesApiResponse>(endpoint);
      
      if (response && response.success) {
        // Handle both cases: data exists or is empty array
        const promoCodesData = Array.isArray(response.data) ? response.data : [];
        setPromoCodes(promoCodesData);
        
        if (isOwnProfile) {
          // Explicitly check for hasOrganization field in response
          // Default to true if not present (backward compatibility)
          const orgStatus = typeof response.hasOrganization === 'boolean' 
            ? response.hasOrganization 
            : true;
          setHasOrganization(orgStatus);
        } else {
          setHasOrganization(null);
        }
      } else {
        const message =
          response?.message || t('common:errors.genericErrorMessage', 'Failed to load promo codes');
        throw new Error(message);
      }
    } catch (err: any) {
      console.error('Failed to load promo codes', err);
      setError(err?.message || t('common:errors.genericErrorMessage', 'Failed to load promo codes'));
      setPromoCodes([]);
      // On error, assume organization exists to allow retry
      if (isOwnProfile) {
        setHasOrganization(true);
      } else {
        setHasOrganization(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, organizationId, request, t]);

  useEffect(() => {
    loadPromoCodes();
  }, [loadPromoCodes]);

  const handleOpenModal = useCallback(
    (promo?: PromoCodeData) => {
      if (!isOwnProfile) {
        return;
      }
      setEditingPromo(promo ?? null);
      setIsModalOpen(true);
    },
    [isOwnProfile],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPromo(null);
  }, []);

  const handleSavePromo = useCallback(
    async (formData: PromoCodeFormData) => {
      setIsSaving(true);
      try {
        // Create UTC end-of-day timestamp to avoid timezone issues
        const [year, month, day] = formData.expiryDate.split('-').map(Number);
        const expiryDateUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        const payload = {
          code: formData.code.toUpperCase().trim(),
          discountType: formData.discountType,
          value: Number(formData.value),
          expiryDate: expiryDateUtc.toISOString(),
          description: formData.description.trim() || null,
          maxUsage: formData.maxUsage ? parseInt(formData.maxUsage, 10) : undefined,
          ...(editingPromo && { status: formData.status }),
        };

        if (editingPromo) {
          const res = await request(`/promo-codes/${editingPromo.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          if (!res?.success) {
            throw new Error(res?.message || t('common:errors.genericErrorMessage'));
          }
          addNotification({
            title: t('common:notifications.successTitle'),
            message: t('settingsPromoCodeManager.promoUpdated'),
            type: 'success',
          });
        } else {
          const res = await request('/promo-codes', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          if (!res?.success) {
            throw new Error(res?.message || t('common:errors.genericErrorMessage'));
          }
          addNotification({
            title: t('common:notifications.successTitle'),
            message: t('settingsPromoCodeManager.promoCreated'),
            type: 'success',
          });
        }

        handleCloseModal();
        await loadPromoCodes();
      } catch (saveError: any) {
        console.error('Failed to save promo code:', saveError);
        addNotification({
          title: t('common:errors.genericErrorTitle'),
          message: saveError?.message || t('common:errors.genericErrorMessage'),
          type: 'error',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [editingPromo, request, addNotification, t, handleCloseModal, loadPromoCodes],
  );

  const handleDeletePromo = useCallback(async (promoId: string) => {
    if (!isOwnProfile) {
      return;
    }

    if (!window.confirm(t('settingsPromoCodeManager.confirmDelete'))) {
      return;
    }

    try {
      const res = await request(`/promo-codes/${promoId}`, { method: 'DELETE' });
      if (!res?.success) {
        throw new Error(res?.message || t('common:errors.genericErrorMessage'));
      }
      addNotification({
        title: t('common:notifications.successTitle'),
        message: t('settingsPromoCodeManager.promoDeleted'),
        type: 'success',
      });
      loadPromoCodes();
    } catch (deleteError: any) {
      console.error('Failed to delete promo code:', deleteError);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: deleteError?.message || t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    }
  }, [isOwnProfile, t, request, addNotification, loadPromoCodes]);

  const copyToClipboard = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  }, []);

  const getDiscountText = useCallback((promo: PromoCodeData) => {
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
  }, [t]);

  const getStatusLabel = useCallback((status: PromoCodeData['status']) => {
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
  }, [t]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language || 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }, [i18n.language]);

  const getStatusBadgeClasses = useCallback((status: string) => {
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
  }, []);

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
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-gray-500">
            {isOwnProfile
              ? t('settingsPromoCodeManager.noCodesYet')
              : t('promoCodesDisplay.noActivePromoCodes')}
          </p>
          {isOwnProfile && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="light" size="sm" leftIcon={ArrowPathIcon} onClick={loadPromoCodes}>
                {t('common:buttons.refresh')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={PlusCircleIcon}
                onClick={() => handleOpenModal()}
              >
                {t('settingsPromoCodeManager.addNewCode')}
              </Button>
            </div>
          )}
        </div>
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
          <div className="flex items-center gap-2">
            <Button variant="light" size="sm" leftIcon={ArrowPathIcon} onClick={loadPromoCodes}>
              {t('common:buttons.refresh')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={PlusCircleIcon}
              onClick={() => handleOpenModal()}
            >
              {t('settingsPromoCodeManager.addNewCode')}
            </Button>
          </div>
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
            <div className="flex flex-wrap gap-2 justify-end">
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
              {isOwnProfile && (
                <>
                  <Button variant="light" size="sm" leftIcon={PencilSquareIcon} onClick={() => handleOpenModal(promo)}>
                    {t('common:buttons.edit')}
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    leftIcon={TrashIcon}
                    className="text-swiss-coral"
                    onClick={() => handleDeletePromo(promo.id)}
                  >
                    {t('common:buttons.delete')}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal (owners only) */}
      {isOwnProfile && (
        <AddPromoCodeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePromo}
          editingPromo={editingPromo}
          isSaving={isSaving}
        />
      )}
    </Card>
  );
};

export default PromoCodesDisplaySection;
