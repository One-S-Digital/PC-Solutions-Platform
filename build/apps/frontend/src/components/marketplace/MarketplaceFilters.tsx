import React, { useState } from 'react';
import { SwissButton, Input } from '@repo/ui';
import { MarketplaceFilters } from '../../services/marketplaceService';
import { useTranslation } from 'react-i18next';

interface MarketplaceFiltersProps {
  filters: MarketplaceFilters;
  onFiltersChange: (filters: MarketplaceFilters) => void;
  type: 'products' | 'services';
}

export function MarketplaceFilters({ filters, onFiltersChange, type }: MarketplaceFiltersProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof MarketplaceFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Search */}
      <div className="flex-1 min-w-0">
        <Input
          type="text"
          placeholder={t('marketplace.searchPlaceholder', 'Search products and services...')}
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Category Filter */}
      <div className="min-w-0">
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
          className="px-3 py-2 border border-border rounded-md bg-surface-1 text-text-default focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">
            {t('marketplace.allCategories', 'All Categories')}
          </option>
          {type === 'products' ? (
            <>
              <option value="Educational Materials">Educational Materials</option>
              <option value="Safety Equipment">Safety Equipment</option>
              <option value="Furniture">Furniture</option>
              <option value="Toys & Games">Toys & Games</option>
              <option value="Books">Books</option>
              <option value="Art Supplies">Art Supplies</option>
            </>
          ) : (
            <>
              <option value="CLEANING">Cleaning</option>
              <option value="IT_SUPPORT">IT Support</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="CONSULTING">Consulting</option>
              <option value="TRAINING">Training</option>
              <option value="OTHER">Other</option>
            </>
          )}
        </select>
      </div>

      {/* Advanced Filters Toggle */}
      <SwissButton
        variant="outline"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {t('marketplace.advancedFilters', 'Advanced')}
      </SwissButton>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <SwissButton
          variant="outline"
          size="sm"
          onClick={clearFilters}
        >
          {t('marketplace.clearFilters', 'Clear')}
        </SwissButton>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="w-full mt-4 p-4 bg-surface-2 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.priceRange', 'Price Range')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={t('marketplace.minPrice', 'Min')}
                  value={filters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder={t('marketplace.maxPrice', 'Max')}
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {t('marketplace.status', 'Status')}
              </label>
              <select
                value={filters.isActive !== undefined ? filters.isActive.toString() : ''}
                onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-1 text-text-default focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('marketplace.allStatus', 'All Status')}</option>
                <option value="true">{t('marketplace.active', 'Active')}</option>
                <option value="false">{t('marketplace.inactive', 'Inactive')}</option>
              </select>
            </div>

            {/* Supplier/Provider Filter */}
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">
                {type === 'products' 
                  ? t('marketplace.supplier', 'Supplier')
                  : t('marketplace.provider', 'Provider')
                }
              </label>
              <Input
                type="text"
                placeholder={t('marketplace.searchSupplier', 'Search by name...')}
                value={type === 'products' ? (filters.supplierId || '') : (filters.providerId || '')}
                onChange={(e) => handleFilterChange(
                  type === 'products' ? 'supplierId' : 'providerId', 
                  e.target.value || undefined
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}