import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';

export type DiscountType = 'Percentage' | 'FixedAmount' | 'FreeMinutes';
export type PromoCodeStatus = 'Active' | 'Expired' | 'Disabled';

export interface PromoCodeFormData {
  code: string;
  discountType: DiscountType;
  value: number;
  expiryDate: string;
  description: string;
  maxUsage: string;
  status: PromoCodeStatus;
}

export interface PromoCodeData {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  expiryDate: string;
  status: PromoCodeStatus;
  description?: string;
  usageCount: number;
  maxUsage?: number;
}

interface AddPromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PromoCodeFormData) => Promise<void>;
  editingPromo?: PromoCodeData | null;
  isSaving: boolean;
}

const initialFormData: PromoCodeFormData = {
  code: '',
  discountType: 'Percentage',
  value: 0,
  expiryDate: '',
  description: '',
  maxUsage: '',
  status: 'Active',
};

const AddPromoCodeModal: React.FC<AddPromoCodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPromo,
  isSaving,
}) => {
  const { t } = useTranslation(['common', 'settings']);
  const [formData, setFormData] = useState<PromoCodeFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof PromoCodeFormData, string>>>({});

  // Reset form when modal opens/closes or editingPromo changes
  useEffect(() => {
    if (isOpen) {
      if (editingPromo) {
        // Populate form with existing promo code data
        setFormData({
          code: editingPromo.code,
          discountType: editingPromo.discountType,
          value: editingPromo.value,
          expiryDate: editingPromo.expiryDate.split('T')[0], // Convert to date input format
          description: editingPromo.description || '',
          maxUsage: editingPromo.maxUsage?.toString() || '',
          status: editingPromo.status,
        });
      } else {
        // Reset to initial state for new promo code
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, editingPromo]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PromoCodeFormData, string>> = {};

    if (!formData.code.trim()) {
      newErrors.code = t('forms.required');
    } else if (formData.code.trim().length < 3) {
      newErrors.code = t('settingsPromoCodeManager.validation.codeMinLength');
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = t('forms.required');
    } else {
      // Parse expiry date as local date components to avoid timezone issues
      // new Date("YYYY-MM-DD") parses as UTC midnight, which can be "yesterday" in negative UTC offsets
      const [year, month, day] = formData.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, day); // Local midnight of selected date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today && !editingPromo) {
        newErrors.expiryDate = t('settingsPromoCodeManager.validation.expiryFuture');
      }
    }

    if (formData.value <= 0) {
      newErrors.value = t('settingsPromoCodeManager.validation.valuePositive');
    }

    if (formData.discountType === 'Percentage' && formData.value > 100) {
      newErrors.value = t('settingsPromoCodeManager.validation.percentageMax');
    }

    if (formData.maxUsage && parseInt(formData.maxUsage, 10) < 1) {
      newErrors.maxUsage = t('settingsPromoCodeManager.validation.maxUsageMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      // Error is handled by parent component
      console.error('Failed to save promo code:', error);
    }
  };

  const handleInputChange = (field: keyof PromoCodeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-modal-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 id="promo-modal-title" className="text-lg font-semibold text-swiss-charcoal">
            {editingPromo 
              ? t('settingsPromoCodeManager.addEditModal.editTitle') 
              : t('settingsPromoCodeManager.addEditModal.addTitle')}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
            aria-label={t('buttons.close')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.code')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint font-mono uppercase ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('settingsPromoCodeManager.form.codePlaceholder')}
              maxLength={50}
            />
            {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.discountType')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.discountType}
              onChange={(e) => handleInputChange('discountType', e.target.value as DiscountType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
            >
              <option value="Percentage">{t('settingsPromoCodeManager.form.percentage')}</option>
              <option value="FixedAmount">{t('settingsPromoCodeManager.form.fixedAmount')}</option>
              <option value="FreeMinutes">{t('settingsPromoCodeManager.form.freeMinutes')}</option>
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.value')} <span className="text-red-500">*</span>
              {formData.discountType === 'Percentage' && ' (%)'}
              {formData.discountType === 'FixedAmount' && ' (CHF)'}
              {formData.discountType === 'FreeMinutes' && ' (minutes)'}
            </label>
            <input
              type="number"
              min="0"
              max={formData.discountType === 'Percentage' ? 100 : undefined}
              step={formData.discountType === 'FixedAmount' ? '0.01' : '1'}
              value={formData.value}
              onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint ${
                errors.value ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.value && <p className="mt-1 text-sm text-red-500">{errors.value}</p>}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.expiryDate')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => handleInputChange('expiryDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint ${
                errors.expiryDate ? 'border-red-500' : 'border-gray-300'
              }`}
              min={!editingPromo ? new Date().toISOString().split('T')[0] : undefined}
            />
            {errors.expiryDate && <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.description')}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
              placeholder={t('settingsPromoCodeManager.form.descriptionPlaceholder')}
              maxLength={255}
            />
          </div>

          {/* Max Usage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.maxUsage')}
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxUsage}
              onChange={(e) => handleInputChange('maxUsage', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint ${
                errors.maxUsage ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('settingsPromoCodeManager.form.maxUsagePlaceholder')}
            />
            {errors.maxUsage && <p className="mt-1 text-sm text-red-500">{errors.maxUsage}</p>}
          </div>

          {/* Status (only for editing) */}
          {editingPromo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settingsPromoCodeManager.form.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as PromoCodeStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint"
              >
                <option value="Active">{t('settingsPromoCodeManager.status.active')}</option>
                <option value="Disabled">{t('settingsPromoCodeManager.status.disabled')}</option>
                <option value="Expired">{t('settingsPromoCodeManager.status.expired')}</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              variant="light" 
              onClick={onClose} 
              disabled={isSaving}
              type="button"
            >
              {t('buttons.cancel')}
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={isSaving}
            >
              {isSaving 
                ? t('settingsPromoCodeManager.addEditModal.saving') 
                : t('settingsPromoCodeManager.addEditModal.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPromoCodeModal;
