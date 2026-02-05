import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, WrenchScrewdriverIcon, TagIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { Service, ServiceCategory, SERVICE_CATEGORIES } from '../../types';
import ServiceUploadModal from '../../components/service-provider/ServiceUploadModal';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { formatServiceCategory, formatServiceDeliveryType } from '../../utils/serviceFormatting';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { UploadedAsset } from '../../services/api';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
}

const ProviderServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit, onDelete }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const categoryLabel = formatServiceCategory(t, service.category);
    const deliveryLabel = formatServiceDeliveryType(t, service.deliveryType);
    return (
        <Card className="flex flex-col group" hoverEffect>
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
  
  const [serviceListings, setServiceListings] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'All'>('All');

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

  const handleServiceSubmit = async (data: Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>, file?: File) => {
    if (!currentUser || !currentUser.orgId || !currentUser.orgName) {
      alert(t('dashboard:serviceProviderListingsPage.missingOrgDetails', 'User organization details are missing.'));
      return;
    }

    try {
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

        if (uploadResponse.success && uploadedAsset?.publicUrl) {
          imageUrl = uploadedAsset.publicUrl;
        }
      }

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

        if (response.success && response.data) {
          setServiceListings(prev =>
            prev.map(s => s.id === editingService.id ? normalizeServiceFromApi(response.data!) : s)
          );
        }
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

        if (response.success && response.data) {
          setServiceListings((prev) => [normalizeServiceFromApi(response.data), ...prev]);
        }
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save service:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`${t('dashboard:serviceProviderListingsPage.saveError', 'Failed to save service')}: ${errMsg}`);
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
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
      alert(t('serviceProviderListingsPage.deleteError', 'Failed to delete service'));
    }
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
      />
    </div>
  );
};

export default ServiceProviderListingsPage;
