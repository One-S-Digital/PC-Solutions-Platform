import React, { useState, useEffect } from 'react';
import { SettingsFormData, UserRole, PromoCode } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import { TagIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../../contexts/NotificationContext';
import LoadingSpinner from '../../shared/LoadingSpinner';

interface ApiPromoCode {
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

interface PromoCodeManagerSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PromoCodeManagerSettings: React.FC<PromoCodeManagerSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'settings']);
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  
  const [promoCodes, setPromoCodes] = useState<ApiPromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<ApiPromoCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for add/edit modal
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
  }, []);

  const loadPromoCodes = async () => {
    setIsLoading(true);
    try {
      const response = await request<{ success: boolean; data: ApiPromoCode[] }>('/promo-codes');
      if (response && (response as any).success && (response as any).data) {
        setPromoCodes((response as any).data);
      }
    } catch (error) {
      console.error('Failed to load promo codes:', error);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (promo?: ApiPromoCode) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        code: promo.code,
        discountType: promo.discountType,
        value: promo.value,
        expiryDate: promo.expiryDate.split('T')[0], // Convert to date input format
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
    if (!formData.code.trim() || !formData.expiryDate) {
      addNotification({
        title: t('common:errors.validationError', 'Validation Error'),
        message: t('settingsPromoCodeManager.validation.required', 'Code and expiry date are required'),
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
          title: t('common:notifications.successTitle', 'Success'),
          message: t('settingsPromoCodeManager.promoUpdated', 'Promo code updated successfully'),
          type: 'success',
        });
      } else {
        await request('/promo-codes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        addNotification({
          title: t('common:notifications.successTitle', 'Success'),
          message: t('settingsPromoCodeManager.promoCreated', 'Promo code created successfully'),
          type: 'success',
        });
      }

      handleCloseModal();
      loadPromoCodes();
    } catch (error) {
      console.error('Failed to save promo code:', error);
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
    if (!window.confirm(t('settingsPromoCodeManager.confirmDelete', 'Are you sure you want to delete this promo code?'))) {
      return;
    }

    try {
      await request(`/promo-codes/${promoId}`, { method: 'DELETE' });
      addNotification({
        title: t('common:notifications.successTitle', 'Success'),
        message: t('settingsPromoCodeManager.promoDeleted', 'Promo code deleted successfully'),
        type: 'success',
      });
      loadPromoCodes();
    } catch (error) {
      console.error('Failed to delete promo code:', error);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    }
  };
  
  const getDiscountText = (promo: ApiPromoCode) => {
    switch(promo.discountType) {
      case 'Percentage': 
        return t('settingsPromoCodeManager.discountTypes.percentage', '{{value}}% off', { value: promo.value });
      case 'FixedAmount': 
        return t('settingsPromoCodeManager.discountTypes.fixedAmount', 'CHF {{value}} off', { value: promo.value });
      case 'FreeMinutes': 
        return t('settingsPromoCodeManager.discountTypes.freeMinutes', '{{value}} free minutes', { value: promo.value });
      default: 
        return promo.description || `${promo.value}`;
    }
  };

  if (isLoading) {
    return (
      <SettingsSectionWrapper title={t('settings:page.promoCodeManager')} icon={TagIcon}>
        <LoadingSpinner text={t('common:loading', 'Loading...')} />
      </SettingsSectionWrapper>
    );
  }

  return (
    <SettingsSectionWrapper title={t('settings:page.promoCodeManager')} icon={TagIcon}>
      <div className="flex justify-between items-center mb-4">
        <Button variant="light" size="sm" leftIcon={ArrowPathIcon} onClick={loadPromoCodes}>
          {t('common:buttons.refresh', 'Refresh')}
        </Button>
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => handleOpenModal()}>
          {t('settingsPromoCodeManager.addNewCode', 'Add New Code')}
        </Button>
      </div>
      
      {promoCodes.length === 0 ? (
        <p className="text-gray-500 text-center py-4">{t('settingsPromoCodeManager.noCodesYet', 'No promo codes yet. Add your first one!')}</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.code', 'Code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.discountOffer', 'Discount')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.expiry', 'Expiry')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.status', 'Status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsPromoCodeManager.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.map(promo => (
                <tr key={promo.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-swiss-charcoal font-mono">{promo.code}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {getDiscountText(promo)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {new Date(promo.expiryDate).toLocaleDateString(i18n.language)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                     <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        promo.status === 'Active' ? 'bg-green-100 text-green-700' :
                        promo.status === 'Expired' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}`}>
                        {promo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="xs" onClick={() => handleOpenModal(promo)}>
                        <PencilSquareIcon className="w-4 h-4"/> {t('common:buttons.edit', 'Edit')}
                    </Button>
                    <Button variant="ghost" size="xs" className="text-swiss-coral" onClick={() => handleDeletePromo(promo.id)}>
                        <TrashIcon className="w-4 h-4"/> {t('common:buttons.delete', 'Delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingPromo 
                  ? t('settingsPromoCodeManager.addEditModal.editTitle', 'Edit Promo Code') 
                  : t('settingsPromoCodeManager.addEditModal.addTitle', 'Add Promo Code')}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.code', 'Code')} *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint font-mono"
                  placeholder="e.g., SAVE20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.discountType', 'Discount Type')} *
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                >
                  <option value="Percentage">{t('settingsPromoCodeManager.form.percentage', 'Percentage Off')}</option>
                  <option value="FixedAmount">{t('settingsPromoCodeManager.form.fixedAmount', 'Fixed Amount Off (CHF)')}</option>
                  <option value="FreeMinutes">{t('settingsPromoCodeManager.form.freeMinutes', 'Free Minutes')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.value', 'Value')} *
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
                  {t('settingsPromoCodeManager.form.expiryDate', 'Expiry Date')} *
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
                  {t('settingsPromoCodeManager.form.description', 'Description (Optional)')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                  placeholder={t('settingsPromoCodeManager.form.descriptionPlaceholder', 'e.g., First-time customer discount')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settingsPromoCodeManager.form.maxUsage', 'Max Usage (Optional)')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                  placeholder={t('settingsPromoCodeManager.form.maxUsagePlaceholder', 'Leave empty for unlimited')}
                />
              </div>

              {editingPromo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settingsPromoCodeManager.form.status', 'Status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
                  >
                    <option value="Active">{t('settingsPromoCodeManager.status.active', 'Active')}</option>
                    <option value="Disabled">{t('settingsPromoCodeManager.status.disabled', 'Disabled')}</option>
                    <option value="Expired">{t('settingsPromoCodeManager.status.expired', 'Expired')}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="light" onClick={handleCloseModal} disabled={isSaving}>
                {t('common:buttons.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" onClick={handleSavePromo} disabled={isSaving}>
                {isSaving ? '...' : t('settingsPromoCodeManager.addEditModal.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SettingsSectionWrapper>
  );
};

export default PromoCodeManagerSettings;
