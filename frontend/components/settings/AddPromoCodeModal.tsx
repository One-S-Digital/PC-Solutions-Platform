import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';

export interface PromoCodeFormData {
  code: string;
  description: string;
  discount: string;
  isActive: boolean;
}

export interface PromoCodeData {
  id: string;
  code: string;
  description?: string;
  discount: string;
  isActive: boolean;
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
  description: '',
  discount: '',
  isActive: true,
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
          description: editingPromo.description || '',
          discount: editingPromo.discount,
          isActive: editingPromo.isActive,
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
    } else if (formData.code.trim().length < 2) {
      newErrors.code = t('settingsPromoCodeManager.validation.codeMinLength');
    }

    if (!formData.discount.trim()) {
      newErrors.discount = t('forms.required');
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

  const handleInputChange = (field: keyof PromoCodeFormData, value: string | boolean) => {
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
            <p className="mt-1 text-xs text-gray-500">
              {t('settingsPromoCodeManager.form.codeHelpText', 'The code customers will use (e.g., SAVE20, FREESHIP)')}
            </p>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.discount')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.discount}
              onChange={(e) => handleInputChange('discount', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint ${
                errors.discount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('settingsPromoCodeManager.form.discountPlaceholder', 'e.g., 20% off, Free shipping, CHF 10 off')}
              maxLength={100}
            />
            {errors.discount && <p className="mt-1 text-sm text-red-500">{errors.discount}</p>}
            <p className="mt-1 text-xs text-gray-500">
              {t('settingsPromoCodeManager.form.discountHelpText', 'Describe the discount customers will receive')}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settingsPromoCodeManager.form.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-swiss-mint resize-none"
              placeholder={t('settingsPromoCodeManager.form.descriptionPlaceholder')}
              maxLength={500}
              rows={3}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('settingsPromoCodeManager.form.descriptionHelpText', 'Optional details about terms or conditions')}
            </p>
          </div>

          {/* Active Status (only for editing) */}
          {editingPromo && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                {t('settingsPromoCodeManager.form.isActive', 'Show on profile')}
              </label>
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
