import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, WrenchScrewdriverIcon, TagIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { Service, ServiceCategory, SERVICE_CATEGORIES } from '../../types';
import ServiceUploadModal from '../../components/service-provider/ServiceUploadModal';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { formatServiceCategory, formatServiceCategoryForService, formatServiceDeliveryType } from '../../utils/serviceFormatting';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { UploadedAsset } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
}

const ProviderServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onToggleSelect, onEdit, onDelete }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const categoryLabel = formatServiceCategoryForService(t, service);
    const deliveryLabel = formatServiceDeliveryType(t, service.deliveryType);
    return (
        <Card className={`flex flex-col group relative ${isSelected ? 'ring-2 ring-swiss-mint' : ''}`} hoverEffect>
            {/* Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(service.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 text-swiss-mint focus:ring-swiss-mint cursor-pointer"
              />
            </div>
            <div className="relative overflow-hidden aspect-[16/10]">
            <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/400/250`} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-5 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-swiss-charcoal mb-1 group-hover:text-swiss-teal transition-colors">{service.title}</h3>
            <p className="text-xs text-gray-500 mb-2">
                <TagIcon className="w-3.5 h-3.5 inline mr-1 opacity-70" /> {t('dashboard:serviceProviderListingsPage.card.category')}: {categoryLabel} | <WrenchScrewdriverIcon className="w-3.5 h-3.5 inline mr-1 opacity-70" /> {t('dashboard:serviceProviderListingsPage.card.delivery')}: {deliveryLabel}
            </p>
            <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-3">{service.description}</p>
            {service.priceInfo && <p className="text-sm font-semibold text-swiss-mint mb-3">{service.priceInfo}</p>}
            <div className="flex space-x-2 mt-auto">
                <Button variant="outline" size="sm" leftIcon={PencilSquareIcon} onClick={() => onEdit(service)} className="flex-1">{t('common:buttons.edit')}</Button>
                <Button variant="danger" size="sm" leftIcon={TrashIcon} onClick={() => onDelete(service.id)} className="flex-1">{t('common:buttons.delete')}</Button>
            </div>
            </div>
        </Card>
    );
};


const ServiceProviderListingsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  const { showToast } = useNotifications();

  const [serviceListings, setServiceListings] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'All'>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const normalizeServiceFromApi = useCallback((service: any): Service => {
    const providerOrgId = service?.provider?.organizationId;
    return {
      ...service,
      // For UI compatibility, treat providerId as the organizationId when available.
      providerId: providerOrgId || service.providerId,
      providerName: service?.provider?.organization?.name || service.providerName,
      // providerLogo is not always included by this endpoint; preserve if present.
      providerLogo: service.providerLogo,
    } as Service;
  }, []);

  const fetchServices = useCallback(async () => {
    if (!currentUser?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedRequest<any[]>('/marketplace/services');
      if (response.success && response.data) {
        const normalized = response.data.map(normalizeServiceFromApi);
        // Filter to only services belonging to this provider
        const myServices = normalized.filter((s) => s.providerId === currentUser.orgId);
        setServiceListings(myServices);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError(t('dashboard:serviceProviderListingsPage.loadError', 'Failed to load services'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.orgId, authenticatedRequest, normalizeServiceFromApi, t]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Get unique categories for filter
  const serviceCategories: (ServiceCategory | 'All')[] = useMemo(() => {
    const cats = new Set(serviceListings.map(s => s.category));
    return ['All', ...SERVICE_CATEGORIES.filter(c => cats.has(c) || serviceListings.length === 0)];
  }, [serviceListings]);

  const handleOpenModal = (service: Service | null = null) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingService(null);
    setIsModalOpen(false);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredServiceListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredServiceListings.map((s) => s.id)));
    }
  };

  const handleServiceSubmit = async (data: Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>, file?: File) => {
    if (!currentUser || !currentUser.orgId || !currentUser.orgName) {
      alert(t('dashboard:serviceProviderListingsPage.missingOrgDetails', 'User organization details are missing.'));
      return;
    }

    try {
      setIsSaving(true);
      // Upload file if provided
      let imageUrl = editingService?.imageUrl;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        // Store as an image asset (not a generic document)
        formData.append('assetKind', 'PRODUCT_IMAGE');

        const uploadResponse = await authenticatedRequest<any>('/upload/file', {
          method: 'POST',
          body: formData,
          headers: {}, // Let browser set Content-Type for FormData
        });

        const uploadedAsset: UploadedAsset | undefined =
          (uploadResponse as any)?.asset ?? (uploadResponse as any)?.data?.asset;

        if (!uploadResponse.success) {
          throw new Error((uploadResponse as any)?.message || 'Image upload failed');
        }
        if (uploadedAsset?.publicUrl) {
          imageUrl = uploadedAsset.publicUrl;
        } else {
          throw new Error('Image upload succeeded but no URL was returned');
        }
      }

      let didSave = false;
      if (editingService) {
        // Update existing service
        // IMPORTANT: Only send fields supported by UpdateServiceDto.
        // Never send `id`, `provider*`, timestamps, or nested provider objects,
        // because backend ValidationPipe forbids non-whitelisted properties.
        const updateServiceData: Record<string, unknown> = {
          title: data.title,
          description: data.description,
          category: data.category,
          categories: data.categories,
          price: typeof (data as any).price === 'string' ? Number((data as any).price) : (data as any).price,
          isActive: (data as any).isActive,
          priceInfo: (data as any).priceInfo,
          availability: (data as any).availability,
          deliveryType: (data as any).deliveryType,
          tags: (data as any).tags,
          imageUrl,
        };

        // Remove undefined and NaN (for numeric fields) to keep payload clean.
        Object.keys(updateServiceData).forEach((k) => {
          const v = (updateServiceData as any)[k];
          if (v === undefined) delete (updateServiceData as any)[k];
          if (typeof v === 'number' && Number.isNaN(v)) delete (updateServiceData as any)[k];
        });

        const response = await authenticatedRequest<Service>(`/marketplace/services/${editingService.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateServiceData),
        });

        if (!response.success || !response.data) {
          throw new Error((response as any)?.message || 'Failed to save service');
        }

        setServiceListings(prev =>
          prev.map(s => s.id === editingService.id ? normalizeServiceFromApi(response.data!) : s)
        );
        showToast({
          type: 'success',
          title: t('common:saveSuccess', 'Saved'),
        });
        didSave = true;
      } else {
        // Add new service
        const newServiceData = {
          title: data.title || t('dashboard:serviceProviderListingsPage.defaultTitle', 'Untitled Service'),
          description: data.description || '',
          category: data.category || ServiceCategory.OTHER,
          categories: data.categories || [],
          price: data.price,
          availability: data.availability || t('dashboard:serviceProviderListingsPage.defaultAvailability', 'By appointment'),
          tags: data.tags || [],
          // IMPORTANT: use canonical backend values, not translated strings.
          deliveryType: data.deliveryType || 'On-site',
          priceInfo: data.priceInfo || t('dashboard:serviceProviderListingsPage.defaultPriceInfo', 'Contact for quote'),
          imageUrl,
        };

        const response = await authenticatedRequest<any>('/marketplace/services', {
          method: 'POST',
          body: JSON.stringify(newServiceData),
        });

        if (!response.success || !response.data) {
          throw new Error((response as any)?.message || 'Failed to save service');
        }

        setServiceListings((prev) => [normalizeServiceFromApi(response.data), ...prev]);
        showToast({
          type: 'success',
          title: t('common:saveSuccess', 'Saved'),
        });
        didSave = true;
      }

      if (didSave) {
        handleCloseModal();
      }
    } catch (err) {
      console.error('Failed to save service:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast({
        type: 'error',
        title: t('dashboard:serviceProviderListingsPage.saveError', 'Failed to save service'),
        message: errMsg,
        duration: 8000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm(t('dashboard:serviceProviderListingsPage.confirmDelete'))) {
      return;
    }

    try {
      const response = await authenticatedRequest<void>(`/marketplace/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        setServiceListings(prev => prev.filter(s => s.id !== serviceId));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(serviceId); return next; });
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
      alert(t('serviceProviderListingsPage.deleteError', 'Failed to delete service'));
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (
      !window.confirm(
        t('common:bulkActions.confirmBulkDelete', 'Permanently delete {{count}} item(s)? This cannot be undone.', { count }),
      )
    ) return;

    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    await Promise.allSettled(
      ids.map((id) => authenticatedRequest<void>(`/marketplace/services/${id}`, { method: 'DELETE' })),
    );
    setServiceListings((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
  };

  const filteredServiceListings = useMemo(() => {
    return serviceListings.filter(service =>
        (service.title.toLowerCase().includes(searchTerm.toLowerCase()) || service.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'All' || service.category === filterCategory)
    );
  }, [serviceListings, searchTerm, filterCategory]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchServices}>{t('common:retry', 'Retry')}</Button>
      </div>
    );
  }

  const allSelected = filteredServiceListings.length > 0 && selectedIds.size === filteredServiceListings.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('dashboard:serviceProviderListingsPage.title')}</h1>
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => handleOpenModal()}>
          {t('dashboard:serviceProviderListingsPage.addNewServiceButton')}
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder={t('dashboard:serviceProviderListingsPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={STANDARD_INPUT_FIELD}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ServiceCategory | 'All')}
            className={STANDARD_INPUT_FIELD}
          >
            {serviceCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'All' ? t('common:filters.all') : formatServiceCategory(t, cat)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Bulk action bar */}
      {filteredServiceListings.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-swiss-mint focus:ring-swiss-mint"
            />
            {allSelected
              ? t('common:bulkActions.deselectAll', 'Deselect all')
              : t('common:bulkActions.selectAll', 'Select all')}
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500">
                {t('common:bulkActions.selected', '{{count}} selected', { count: selectedIds.size })}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                {t('common:bulkActions.deleteSelected', 'Delete selected')}
              </Button>
            </>
          )}
        </div>
      )}

      {filteredServiceListings.length === 0 ? (
        <Card className="p-10 text-center">
          <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('dashboard:serviceProviderListingsPage.emptyState.title')}</h2>
          <p className="text-gray-500">
            {serviceListings.length > 0 ? t('dashboard:serviceProviderListingsPage.emptyState.noMatch') : t('dashboard:serviceProviderListingsPage.emptyState.noServicesYet')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServiceListings.map(service => (
            <ProviderServiceCard
              key={service.id}
              service={service}
              isSelected={selectedIds.has(service.id)}
              onToggleSelect={toggleSelected}
              onEdit={handleOpenModal}
              onDelete={handleDeleteService}
            />
          ))}
        </div>
      )}

      <ServiceUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleServiceSubmit}
        existingService={editingService}
        isSaving={isSaving}
      />
    </div>
  );
};

export default ServiceProviderListingsPage;
