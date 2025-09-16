import React, { useState, useEffect } from 'react';
import { SwissCard, SwissButton, Input, Badge } from '@repo/ui';
import { Product, CreateProductData, UpdateProductData } from '../../services/marketplaceService';
import { useTranslation } from 'react-i18next';

interface ProductFormProps {
  product?: Product | null;
  onSave: (data: CreateProductData | UpdateProductData) => void;
  onClose: () => void;
}

export function ProductForm({ product, onSave, onClose }: ProductFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    tags: [] as string[],
    imageAssetId: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        tags: product.tags || [],
        imageAssetId: product.imageAsset?.id || '',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        title: formData.title,
        description: formData.description || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        category: formData.category || undefined,
        tags: formData.tags,
        imageAssetId: formData.imageAssetId || undefined,
      };

      await onSave(data);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <SwissCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-default">
            {product 
              ? t('marketplace.editProduct', 'Edit Product')
              : t('marketplace.addProduct', 'Add Product')
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
                {t('marketplace.productTitle', 'Product Title')} *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('marketplace.enterProductTitle', 'Enter product title')}
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
                placeholder={t('marketplace.enterDescription', 'Enter product description')}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-1 text-text-default focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
              />
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
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.category', 'Category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-1 text-text-default focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('marketplace.selectCategory', 'Select category')}</option>
                <option value="Educational Materials">Educational Materials</option>
                <option value="Safety Equipment">Safety Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Toys & Games">Toys & Games</option>
                <option value="Books">Books</option>
                <option value="Art Supplies">Art Supplies</option>
                <option value="Technology">Technology</option>
                <option value="Outdoor Equipment">Outdoor Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.tags', 'Tags')}
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('marketplace.addTag', 'Add tag')}
                  className="flex-1"
                />
                <SwissButton
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                >
                  {t('marketplace.add', 'Add')}
                </SwissButton>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="info"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Image Asset ID */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.imageAssetId', 'Image Asset ID')}
              </label>
              <Input
                type="text"
                value={formData.imageAssetId}
                onChange={(e) => setFormData({ ...formData, imageAssetId: e.target.value })}
                placeholder={t('marketplace.enterImageAssetId', 'Enter image asset ID')}
              />
              <p className="text-xs text-text-secondary mt-1">
                {t('marketplace.imageAssetIdHelp', 'Upload an image first to get the asset ID')}
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
              : product 
                ? t('marketplace.updateProduct', 'Update Product')
                : t('marketplace.createProduct', 'Create Product')
            }
          </SwissButton>
        </div>
      </SwissCard>
    </div>
  );
}