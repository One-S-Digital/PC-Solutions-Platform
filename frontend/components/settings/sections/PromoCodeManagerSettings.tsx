import React, { useState, useEffect, useCallback } from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import { TagIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../../contexts/NotificationContext';
import LoadingSpinner from '../../shared/LoadingSpinner';
import AddPromoCodeModal, { PromoCodeData, PromoCodeFormData } from '../AddPromoCodeModal';

interface PromoCodesApiResponse {
  success: boolean;
  data: PromoCodeData[];
  hasOrganization?: boolean;
  message?: string;
}

interface CreatePromoCodeResponse {
  success: boolean;
  data: PromoCodeData;
  message?: string;
}

interface PromoCodeManagerSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PromoCodeManagerSettings: React.FC<PromoCodeManagerSettingsProps> = ({ 
  settings, 
  onChange, 
  userRole 
}) => {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  
  // State
  const [promoCodes, setPromoCodes] = useState<PromoCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load promo codes from API
  const loadPromoCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await request<PromoCodesApiResponse>('/promo-codes');
      
      if (response && response.success) {
        const promoCodesData = Array.isArray(response.data) ? response.data : [];
        setPromoCodes(promoCodesData);
      } else {
        setPromoCodes([]);
      }
    } catch (error) {
      console.error('Failed to load promo codes:', error);
      addNotification({
        title: t('errors.genericErrorTitle'),
        message: t('errors.genericErrorMessage'),
        type: 'error',
      });
      setPromoCodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, addNotification, t]);

  // Load promo codes on mount
  useEffect(() => {
    loadPromoCodes();
  }, [loadPromoCodes]);

  // Open modal for new promo code
  const handleAddNew = useCallback(() => {
    setEditingPromo(null);
    setIsModalOpen(true);
  }, []);

  // Open modal for editing
  const handleEdit = useCallback((promo: PromoCodeData) => {
    setEditingPromo(promo);
    setIsModalOpen(true);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPromo(null);
  }, []);

  // Save promo code (create or update)
  const handleSave = useCallback(async (formData: PromoCodeFormData) => {
    setIsSaving(true);
    
    try {
      // Manual promo codes may omit expiry; default to far-future.
      const rawExpiry = formData.expiryDate?.trim() ? formData.expiryDate : '2099-12-31';
      // Create UTC end-of-day timestamp to avoid timezone issues
      const [year, month, day] = rawExpiry.split('-').map(Number);
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
        // Update existing promo code
        const res = await request<CreatePromoCodeResponse>(`/promo-codes/${editingPromo.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (!res?.success) {
          throw new Error(res?.message || t('errors.genericErrorMessage'));
        }
        
        addNotification({
          title: t('notifications.successTitle'),
          message: t('settingsPromoCodeManager.promoUpdated'),
          type: 'success',
        });
      } else {
        // Create new promo code
        const res = await request<CreatePromoCodeResponse>('/promo-codes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res?.success) {
          throw new Error(res?.message || t('errors.genericErrorMessage'));
        }
        
        addNotification({
          title: t('notifications.successTitle'),
          message: t('settingsPromoCodeManager.promoCreated'),
          type: 'success',
        });
      }

      // Close modal and reload data
      handleCloseModal();
      await loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to save promo code:', error);
      
      // Extract error message from response
      const errorMessage = error?.message || t('errors.genericErrorMessage');
      
      addNotification({
        title: t('errors.genericErrorTitle'),
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingPromo, request, addNotification, t, handleCloseModal, loadPromoCodes]);

  // Delete promo code
  const handleDelete = useCallback(async (promoId: string) => {
    const confirmed = window.confirm(t('settingsPromoCodeManager.confirmDelete'));
    
    if (!confirmed) {
      return;
    }

    try {
      const res = await request(`/promo-codes/${promoId}`, { method: 'DELETE' });
      if (!res?.success) {
        throw new Error(res?.message || t('errors.genericErrorMessage'));
      }
      
      addNotification({
        title: t('notifications.successTitle'),
        message: t('settingsPromoCodeManager.promoDeleted'),
        type: 'success',
      });
      
      // Reload data
      await loadPromoCodes();
    } catch (error) {
      console.error('Failed to delete promo code:', error);
      addNotification({
        title: t('errors.genericErrorTitle'),
        message: t('errors.genericErrorMessage'),
        type: 'error',
      });
    }
  }, [t, request, addNotification, loadPromoCodes]);

  // Format discount display text
  const getDiscountText = useCallback((promo: PromoCodeData) => {
    switch (promo.discountType) {
      case 'Percentage':
        return t('settingsPromoCodeManager.discountTypes.percentage', { value: promo.value });
      case 'FixedAmount':
        return t('settingsPromoCodeManager.discountTypes.fixedAmount', { value: promo.value });
      case 'FreeMinutes':
        return t('settingsPromoCodeManager.discountTypes.freeMinutes', { value: promo.value });
      default:
        return promo.description || `${promo.value}`;
    }
  }, [t]);

  // Get status label
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

  // Get status badge styles
  const getStatusBadgeClass = useCallback((status: PromoCodeData['status']) => {
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

  // Loading state
  if (isLoading) {
    return (
      <SettingsSectionWrapper title={t('settings:page.promoCodeManager')} icon={TagIcon}>
        <LoadingSpinner text={t('loading')} />
      </SettingsSectionWrapper>
    );
  }

  return (
    <SettingsSectionWrapper title={t('settings:page.promoCodeManager')} icon={TagIcon}>
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <Button 
          variant="light" 
          size="sm" 
          leftIcon={ArrowPathIcon} 
          onClick={loadPromoCodes}
        >
          {t('buttons.refresh')}
        </Button>
        <Button 
          variant="primary" 
          leftIcon={PlusCircleIcon} 
          onClick={handleAddNew}
        >
          {t('settingsPromoCodeManager.addNewCode')}
        </Button>
      </div>
      
      {/* Empty state */}
      {promoCodes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <TagIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">{t('settingsPromoCodeManager.noCodesYet')}</p>
          <Button 
            variant="primary" 
            size="sm"
            leftIcon={PlusCircleIcon}
            onClick={handleAddNew}
            className="mt-4"
          >
            {t('settingsPromoCodeManager.addNewCode')}
          </Button>
        </div>
      ) : (
        /* Promo codes table */
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('settingsPromoCodeManager.table.code')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('settingsPromoCodeManager.table.discountOffer')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('settingsPromoCodeManager.table.expiry')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('settingsPromoCodeManager.table.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('settingsPromoCodeManager.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-swiss-charcoal font-mono bg-gray-100 px-2 py-1 rounded">
                      {promo.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {getDiscountText(promo)}
                    {promo.description && (
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {promo.description}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {(() => {
                      const d = new Date(promo.expiryDate);
                      const isNoExpiry = Number.isFinite(d.getTime()) && d.getUTCFullYear() >= 2099;
                      if (isNoExpiry) return '—';
                      return d.toLocaleDateString(i18n.language);
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(promo.status)}`}>
                      {getStatusLabel(promo.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => handleEdit(promo)}
                        className="text-swiss-charcoal hover:text-swiss-mint"
                      >
                        <PencilSquareIcon className="w-4 h-4 mr-1" />
                        {t('buttons.edit')}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => handleDelete(promo.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        {t('buttons.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <AddPromoCodeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingPromo={editingPromo}
        isSaving={isSaving}
      />
    </SettingsSectionWrapper>
  );
};

export default PromoCodeManagerSettings;
