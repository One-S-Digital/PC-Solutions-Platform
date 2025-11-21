import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../contexts/NotificationContext';
import { Product, StockStatus } from '../../types';
import { ICON_INPUT_FIELD } from '../../constants';
import { formatCategory } from '../../utils/serviceFormatting';
import ProductUploadModal, { ProductFormState } from '../../components/supplier/ProductUploadModal';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=60';

const SupplierProductListingsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!currentUser?.orgId) {
      return;
    }

    setIsLoading(true);
    try {
      const query = new URLSearchParams({ supplierId: currentUser.orgId });
      const response = await request<{ data?: Product[] }>(
        `/marketplace/products?${query.toString()}`,
      );
      if (response.success === false) {
        throw new Error(response.message || 'Failed to fetch products');
      }
      setProducts(response.data ?? []);
    } catch (error) {
      console.error('Failed to load products', error);
      addNotification({
        type: 'error',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.loadErrorTitle',
          'Unable to load products',
        ),
        message:
          error instanceof Error
            ? error.message
            : t(
                'dashboard:supplierProductListingsPage.notifications.loadErrorMessage',
                'Please try again shortly.',
              ),
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.orgId, request, addNotification, t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    if (!currentUser?.orgId) {
      return [];
    }

    const lowerSearch = searchTerm.trim().toLowerCase();
    return products
      .filter((product) => product.supplierId === currentUser.orgId)
      .filter((product) => {
        if (!lowerSearch) {
          return true;
        }
        const haystack = [
          product.title,
          product.subtitle,
          product.sku,
          product.vendorSku,
          ...(product.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerSearch);
      });
  }, [products, currentUser?.orgId, searchTerm]);

  const getStockStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-700';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-700';
      case 'Out of Stock':
        return 'bg-red-100 text-red-700';
      case 'On Demand':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const openModal = (product?: Product) => {
    setEditingProduct(product ?? null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const sanitizeNumber = (value: string) => {
    if (!value || value.trim() === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const sanitizeDate = (value: string) => {
    if (!value || value.trim() === '') {
      return undefined;
    }
    const iso = new Date(value);
    return Number.isNaN(iso.getTime()) ? undefined : iso.toISOString();
  };

  const buildProductPayload = (formState: ProductFormState) => {
    const volumePricing = formState.volumePricing
      .map((tier) => ({
        minQuantity: sanitizeNumber(tier.minQuantity),
        price: sanitizeNumber(tier.price),
      }))
      .filter(
        (tier) =>
          tier.minQuantity !== undefined && tier.price !== undefined,
      );

    const variants = formState.variants
      .map((variant) => ({
        name: variant.name?.trim(),
        sku: variant.sku?.trim() || undefined,
        price: sanitizeNumber(variant.price),
        stockQuantity: sanitizeNumber(variant.stockQuantity),
        stockStatus: variant.stockStatus,
        attributes: variant.attributes?.filter(Boolean) ?? [],
      }))
      .filter((variant) => variant.name);

    const deliveryFees = formState.deliveryFees
      .map((fee) => ({
        method: fee.method?.trim(),
        fee: sanitizeNumber(fee.fee),
        currency: fee.currency?.trim() || undefined,
      }))
      .filter(
        (fee) => fee.method && fee.fee !== undefined,
      );

    return {
      title: formState.title.trim(),
      subtitle: formState.subtitle?.trim() || undefined,
      description: formState.description?.trim() || undefined,
      price: sanitizeNumber(formState.price),
      priceCurrency: formState.priceCurrency?.trim() || 'CHF',
      primaryCategory: formState.primaryCategory?.trim() || undefined,
      categories: formState.categories,
      tags: formState.tags,
      productHighlights: formState.productHighlights,
      unitOfMeasure: formState.unitOfMeasure?.trim() || undefined,
      availabilityStatus: formState.availabilityStatus,
      isActive: formState.isActive,
      sku: formState.sku?.trim() || undefined,
      vendorSku: formState.vendorSku?.trim() || undefined,
      ean: formState.ean?.trim() || undefined,
      minOrderQuantity: sanitizeNumber(formState.minOrderQuantity),
      maxOrderQuantity: sanitizeNumber(formState.maxOrderQuantity),
      stockStatus: formState.stockStatus,
      deliveryLeadTimeDays: sanitizeNumber(formState.deliveryLeadTimeDays),
      restockCadence: formState.restockCadence?.trim() || undefined,
      usageNotes: formState.usageNotes?.trim() || undefined,
      packagingDetails: formState.packagingDetails?.trim() || undefined,
      materials: formState.materials?.trim() || undefined,
      complianceTags: formState.complianceTags,
      allergens: formState.allergens,
      ageRanges: formState.ageRanges,
      deliveryMethods: formState.deliveryMethods,
      deliveryFees: deliveryFees.length > 0 ? deliveryFees : undefined,
      supportedCantons: formState.supportedCantons,
      visibilityStart: sanitizeDate(formState.visibilityStart),
      visibilityEnd: sanitizeDate(formState.visibilityEnd),
      volumePricing: volumePricing.length > 0 ? volumePricing : undefined,
      variants: variants.length > 0 ? variants : undefined,
      imageAssetId: formState.imageAssetId,
      galleryAssetIds: formState.galleryAssetIds,
      specSheetAssetId: formState.specSheetAssetId,
      msdsAssetId: formState.msdsAssetId,
    };
  };

  const handleSubmitProduct = async (formState: ProductFormState) => {
    if (!currentUser?.orgId) {
      addNotification({
        type: 'error',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.missingOrgTitle',
          'Organization required',
        ),
        message: t(
          'dashboard:supplierProductListingsPage.notifications.missingOrgMessage',
          'You need an organization ID to manage products.',
        ),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildProductPayload(formState);
      const endpoint = editingProduct
        ? `/marketplace/products/${editingProduct.id}`
        : '/marketplace/products';
      const method = editingProduct ? 'PATCH' : 'POST';
      const response = await request<{ data?: Product }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.success === false) {
        throw new Error(response.message || 'Failed to save product');
      }

      const savedProduct = response.data;
      if (savedProduct) {
        setProducts((prev) => {
          if (editingProduct) {
            return prev.map((product) =>
              product.id === savedProduct.id ? savedProduct : product,
            );
          }
          return [savedProduct, ...prev];
        });
      } else {
        await loadProducts();
      }

      addNotification({
        type: 'success',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.createSuccessTitle',
          'Product saved',
        ),
        message: editingProduct
          ? t(
              'dashboard:supplierProductListingsPage.notifications.updateSuccessMessage',
              'Your product was updated successfully.',
            )
          : t(
              'dashboard:supplierProductListingsPage.notifications.createSuccessMessage',
              'Your product was published to the marketplace.',
            ),
      });
      closeModal();
    } catch (error) {
      console.error('Failed to save product', error);
      addNotification({
        type: 'error',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.createErrorTitle',
          'Unable to save product',
        ),
        message:
          error instanceof Error
            ? error.message
            : t(
                'dashboard:supplierProductListingsPage.notifications.createErrorMessage',
                'Please review the form and try again.',
              ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    try {
      const response = await request<{ data?: Product }>(
        `/marketplace/products/${product.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !product.isActive }),
        },
      );

      if (response.success === false) {
        throw new Error(response.message || 'Failed to update product');
      }

      const updatedProduct = response.data;
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? updatedProduct ?? { ...item, isActive: !item.isActive }
            : item,
        ),
      );

      addNotification({
        type: 'success',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.toggleSuccessTitle',
          'Visibility updated',
        ),
        message: !product.isActive
          ? t(
              'dashboard:supplierProductListingsPage.notifications.toggleVisible',
              'The product is now visible in the marketplace.',
            )
          : t(
              'dashboard:supplierProductListingsPage.notifications.toggleHidden',
              'The product is hidden from the marketplace.',
            ),
      });
    } catch (error) {
      console.error('Failed to toggle product visibility', error);
      addNotification({
        type: 'error',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.toggleErrorTitle',
          'Unable to update visibility',
        ),
        message:
          error instanceof Error
            ? error.message
            : t(
                'dashboard:supplierProductListingsPage.notifications.toggleErrorMessage',
                'Please try again.',
              ),
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (
      !window.confirm(
        t(
          'dashboard:supplierProductListingsPage.confirmDelete',
          'Are you sure you want to delete this product?',
        ),
      )
    ) {
      return;
    }

    try {
      const response = await request(`/marketplace/products/${productId}`, {
        method: 'DELETE',
      });
      if (response.success === false) {
        throw new Error(response.message || 'Failed to delete product');
      }

      setProducts((prev) => prev.filter((product) => product.id !== productId));
      addNotification({
        type: 'success',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.deleteSuccessTitle',
          'Product deleted',
        ),
        message: t(
          'dashboard:supplierProductListingsPage.notifications.deleteSuccessMessage',
          'The product has been removed.',
        ),
      });
    } catch (error) {
      console.error('Failed to delete product', error);
      addNotification({
        type: 'error',
        title: t(
          'dashboard:supplierProductListingsPage.notifications.deleteErrorTitle',
          'Unable to delete product',
        ),
        message:
          error instanceof Error
            ? error.message
            : t(
                'dashboard:supplierProductListingsPage.notifications.deleteErrorMessage',
                'Please try again later.',
              ),
      });
    }
  };

  const formatPrice = (product: Product) => {
    if (product.price === undefined || product.price === null) {
      return t('common:notAvailable', 'N/A');
    }
    try {
      return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: product.priceCurrency || 'CHF',
        minimumFractionDigits: 2,
      }).format(product.price);
    } catch {
      return `CHF ${product.price.toFixed(2)}`;
    }
  };

  const getProductImage = (product: Product) =>
    product.imageAsset?.publicUrl ||
    product.imageAsset?.url ||
    product.imageUrl ||
    FALLBACK_IMAGE;

  if (!currentUser?.orgId) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">
          {t(
            'dashboard:supplierProductListingsPage.noOrgMessage',
            'You need an organization to manage product listings.',
          )}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">
            {t('dashboard:supplierProductListingsPage.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              'dashboard:supplierProductListingsPage.subtitle',
              'Publish high-quality listings and keep daycares informed.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={ArrowPathIcon}
            onClick={loadProducts}
            disabled={isLoading}
            >
              {t('common:buttons.refresh', 'Refresh')}
            </Button>
            <Button
              variant="primary"
              leftIcon={PlusCircleIcon}
              onClick={() => openModal()}
            >
              {t('dashboard:supplierProductListingsPage.addProductButton')}
            </Button>
          </div>
        </div>
        <Card className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t('dashboard:supplierProductListingsPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${ICON_INPUT_FIELD} w-full`}
            />
          </div>
        </Card>
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-gray-500">
              {t('common:loading', 'Loading...')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard:supplierProductListingsPage.table.product')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard:supplierProductListingsPage.table.price')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard:supplierProductListingsPage.table.stock')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard:supplierProductListingsPage.table.visibility')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard:supplierProductListingsPage.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            className="h-12 w-12 rounded-md object-cover border border-gray-100"
                            src={getProductImage(product)}
                            alt={product.title}
                          />
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-swiss-charcoal">
                              {product.title}
                            </div>
                            {product.subtitle && (
                              <div className="text-xs text-gray-500">
                                {product.subtitle}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {formatCategory(product.primaryCategory || product.category)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatPrice(product)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockStatusColor(
                            (product.stockStatus as StockStatus) || 'In Stock',
                          )}`}
                        >
                          {t(
                            `dashboard:stockStatus.${(product.stockStatus || 'In Stock')
                              .replace(/\s+/g, '')
                              .toLowerCase()}`,
                            product.stockStatus || 'In Stock',
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.isActive ? (
                          <span className="text-green-600 font-medium">
                            {t('dashboard:supplierProductListingsPage.visibility.visible', 'Visible')}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">
                            {t('dashboard:supplierProductListingsPage.visibility.hidden', 'Hidden')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openModal(product)}
                          className="text-blue-600 hover:text-blue-700"
                          title={t('common:buttons.edit', 'Edit')}
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleToggleVisibility(product)}
                          title={t(
                            'dashboard:supplierProductListingsPage.table.toggleVisibility',
                            'Toggle visibility',
                          )}
                        >
                          {product.isActive ? (
                            <EyeSlashIcon className="w-4 h-4 text-gray-500" />
                          ) : (
                            <EyeIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                          title={t('common:buttons.delete', 'Delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && !isLoading && (
                <p className="text-center text-gray-500 py-8">
                  {t('dashboard:supplierProductListingsPage.emptyState')}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
      <ProductUploadModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmitProduct}
        initialProduct={editingProduct}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default SupplierProductListingsPage;
