import React, { useState, useEffect } from 'react';
import { SwissCard, SwissButton, Input } from '@repo/ui';
import { Service, CreateServiceData, UpdateServiceData } from '../../services/marketplaceService';
import { useTranslation } from 'react-i18next';

interface ServiceFormProps {
  service?: Service | null;
  onSave: (data: CreateServiceData | UpdateServiceData) => void;
  onClose: () => void;
}

export function ServiceForm({ service, onSave, onClose }: ServiceFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'CLEANING',
    price: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title,
        description: service.description || '',
        category: service.category,
        price: service.price?.toString() || '',
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category as any,
        price: formData.price ? parseFloat(formData.price) : undefined,
      };

      await onSave(data);
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setLoading(false);
    }
  };

  const serviceCategories = [
    { value: 'CLEANING', label: t('marketplace.serviceCategory.CLEANING', 'Cleaning') },
    { value: 'IT_SUPPORT', label: t('marketplace.serviceCategory.IT_SUPPORT', 'IT Support') },
    { value: 'MAINTENANCE', label: t('marketplace.serviceCategory.MAINTENANCE', 'Maintenance') },
    { value: 'CONSULTING', label: t('marketplace.serviceCategory.CONSULTING', 'Consulting') },
    { value: 'TRAINING', label: t('marketplace.serviceCategory.TRAINING', 'Training') },
    { value: 'OTHER', label: t('marketplace.serviceCategory.OTHER', 'Other') },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <SwissCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-default">
            {service 
              ? t('marketplace.editService', 'Edit Service')
              : t('marketplace.addService', 'Add Service')
            }
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-default transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.serviceTitle', 'Service Title')} *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('marketplace.enterServiceTitle', 'Enter service title')}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.description', 'Description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('marketplace.enterDescription', 'Enter service description')}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-1 text-text-default focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.category', 'Category')} *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-1 text-text-default focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {serviceCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.price', 'Price')} (CHF)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder={t('marketplace.enterPrice', 'Enter price')}
              />
              <p className="text-xs text-text-secondary mt-1">
                {t('marketplace.priceOptional', 'Leave empty for price on request')}
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <SwissButton
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t('marketplace.cancel', 'Cancel')}
          </SwissButton>
          <SwissButton
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim()}
          >
            {loading 
              ? t('marketplace.saving', 'Saving...')
              : service 
                ? t('marketplace.updateService', 'Update Service')
                : t('marketplace.createService', 'Create Service')
            }
          </SwissButton>
        </div>
      </SwissCard>
    </div>
  );
}