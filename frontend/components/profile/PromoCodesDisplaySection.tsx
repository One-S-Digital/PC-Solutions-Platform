import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TagIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../contexts/NotificationContext';

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
  const { addNotification } = useNotifications();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'Percentage' as 'Percentage' | 'FixedAmount' | 'FreeMinutes',
    value: 0,
    expiryDate: '',
    description: '',
    maxUsage: '',
    status: 'Active' as 'Active' | 'Expired' | 'Disabled',
  });

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

  const handleOpenModal = (promo?: PromoCode) => {
    if (!isOwnProfile) {
      return;
    }

    if (promo) {
      setEditingPromo(promo);
      setFormData({
        code: promo.code,
        discountType: promo.discountType,
        value: promo.value,
        expiryDate: promo.expiryDate.split('T')[0],
        description: promo.description || '',
        maxUsage: promo.maxUsage?.toString() || '',
        status: promo.status,
      });
    } else {
      setEditingPromo(null);
      setFormData({
        code: '',
        discountType: 'Percentage',
        value: 0,
        expiryDate: '',
        description: '',
        maxUsage: '',
        status: 'Active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromo(null);
  };

  const handleSavePromo = async () => {
    if (!isOwnProfile) {
      return;
    }

    if (!formData.code.trim() || !formData.expiryDate) {
      addNotification({
        title: t('common:errors.validationError'),
        message: t('settingsPromoCodeManager.validation.required'),
        type: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        value: Number(formData.value),
        expiryDate: new Date(`${formData.expiryDate}T23:59:59`).toISOString(),
        description: formData.description || undefined,
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : undefined,
        ...(editingPromo && { status: formData.status }),
      };

      if (editingPromo) {
        await request(`/promo-codes/${editingPromo.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        addNotification({
          title: t('common:notifications.successTitle'),
          message: t('settingsPromoCodeManager.promoUpdated'),
          type: 'success',
        });
      } else {
        await request('/promo-codes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        addNotification({
          title: t('common:notifications.successTitle'),
          message: t('settingsPromoCodeManager.promoCreated'),
          type: 'success',
        });
      }

      handleCloseModal();
      loadPromoCodes();
    } catch (saveError) {
      console.error('Failed to save promo code:', saveError);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!isOwnProfile) {
      return;
    }

    if (!window.confirm(t('settingsPromoCodeManager.confirmDelete'))) {
      return;
    }

    try {
      await request(`/promo-codes/${promoId}`, { method: 'DELETE' });
      addNotification({
        title: t('common:notifications.successTitle'),
        message: t('settingsPromoCodeManager.promoDeleted'),
        type: 'success',
      });
      loadPromoCodes();
    } catch (deleteError) {
      console.error('Failed to delete promo code:', deleteError);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
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
              <Button variant="primary" size="sm" leftIcon={PlusCircleIcon} onClick={() => handleOpenModal()}>
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
            <Button variant="primary" size="sm" leftIcon={PlusCircleIcon} onClick={() => handleOpenModal()}>
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
      {isOwnProfile && isModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingPromo
                  ? t('settingsPromoCodeManager.addEditModal.editTitle')
                  : t('settingsPromoCodeManager.addEditModal.addTitle')}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.code')} *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint font-mono"
                  placeholder={t('settingsPromoCodeManager.form.codePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.discountType')} *
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                >
                  <option value="Percentage">{t('settingsPromoCodeManager.form.percentage')}</option>
                  <option value="FixedAmount">{t('settingsPromoCodeManager.form.fixedAmount')}</option>
                  <option value="FreeMinutes">{t('settingsPromoCodeManager.form.freeMinutes')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.value')} *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.expiryDate')} *
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.description')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                  placeholder={t('settingsPromoCodeManager.form.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.maxUsage')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                  placeholder={t('settingsPromoCodeManager.form.maxUsagePlaceholder')}
                />
              </div>

              {editingPromo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settingsPromoCodeManager.form.status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                  >
                    <option value="Active">{t('settingsPromoCodeManager.status.active')}</option>
                    <option value="Disabled">{t('settingsPromoCodeManager.status.disabled')}</option>
                    <option value="Expired">{t('settingsPromoCodeManager.status.expired')}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="light" onClick={handleCloseModal} disabled={isSaving}>
                {t('common:buttons.cancel')}
              </Button>
              <Button variant="primary" onClick={handleSavePromo} disabled={isSaving}>
                {isSaving ? t('settingsPromoCodeManager.addEditModal.saving') : t('settingsPromoCodeManager.addEditModal.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PromoCodesDisplaySection;
