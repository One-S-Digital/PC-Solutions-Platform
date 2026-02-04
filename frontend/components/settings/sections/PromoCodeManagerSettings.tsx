import React, { useState, useEffect, useCallback } from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import { TagIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
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
  const { t } = useTranslation(['common', 'settings']);
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
      const payload = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim() || null,
        discount: formData.discount.trim(),
        isActive: formData.isActive,
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
      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        {t('settingsPromoCodeManager.description', 'Create promo codes to display on your public profile. Customers can see these codes and use them when making purchases.')}
      </p>

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
                  {t('settingsPromoCodeManager.table.discount', 'Discount')}
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
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 font-medium">{promo.discount}</div>
                    {promo.description && (
                      <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">
                        {promo.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${
                      promo.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {promo.isActive ? (
                        <>
                          <EyeIcon className="w-3 h-3" />
                          {t('settingsPromoCodeManager.status.active')}
                        </>
                      ) : (
                        <>
                          <EyeSlashIcon className="w-3 h-3" />
                          {t('settingsPromoCodeManager.status.hidden', 'Hidden')}
                        </>
                      )}
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
