import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, EyeIcon, WrenchScrewdriverIcon, TagIcon } from '@heroicons/react/24/outline';
import { MOCK_SERVICES, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../../constants';
import { Service, ServiceCategory, SERVICE_CATEGORIES } from '../../types';
import ServiceUploadModal from '../../components/service-provider/ServiceUploadModal';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
}

const ProviderServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit, onDelete }) => {
    const { t } = useTranslation();
    return (
        <Card className="flex flex-col group" hoverEffect>
            <div className="relative overflow-hidden aspect-[16/10]">
            <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/400/250`} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-5 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-swiss-charcoal mb-1 group-hover:text-swiss-teal transition-colors">{service.title}</h3>
            <p className="text-xs text-gray-500 mb-2">
                <TagIcon className="w-3.5 h-3.5 inline mr-1 opacity-70" /> {t('serviceProviderListingsPage.card.category')}: {service.category} | <WrenchScrewdriverIcon className="w-3.5 h-3.5 inline mr-1 opacity-70" /> {t('serviceProviderListingsPage.card.delivery')}: {service.deliveryType || 'N/A'}
            </p>
            <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-3">{service.description}</p>
            {service.priceInfo && <p className="text-sm font-semibold text-swiss-mint mb-3">{service.priceInfo}</p>}
            <div className="flex space-x-2 mt-auto">
                <Button variant="outline" size="sm" leftIcon={PencilSquareIcon} onClick={() => onEdit(service)} className="flex-1">{t('buttons.edit')}</Button>
                <Button variant="danger" size="sm" leftIcon={TrashIcon} onClick={() => onDelete(service.id)} className="flex-1">{t('buttons.delete')}</Button>
            </div>
            </div>
        </Card>
    );
};


const ServiceProviderListingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const [serviceListings, setServiceListings] = useState<Service[]>(
    // Filter MOCK_SERVICES to only those belonging to the current service provider for initial state
    MOCK_SERVICES.filter(s => s.providerId === currentUser?.orgId)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'All'>('All');
  
  const serviceCategories: (ServiceCategory | 'All')[] = ['All', ...new Set(MOCK_SERVICES.map(s => s.category))];


  const handleOpenModal = (service: Service | null = null) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingService(null);
    setIsModalOpen(false);
  };

  const handleServiceSubmit = (data: Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>, file?: File) => {
    if (!currentUser || !currentUser.orgId || !currentUser.orgName) {
        alert("User organization details are missing.");
        return;
    }

    const providerId = currentUser.orgId;
    const providerName = currentUser.orgName;
    const providerLogo = currentUser.avatarUrl; // Assuming user avatar can be provider logo for simplicity

    if (editingService) {
      // Update existing service
      setServiceListings(prev =>
        prev.map(s =>
          s.id === editingService.id
            ? { ...s, ...data, imageUrl: file ? URL.createObjectURL(file) : s.imageUrl, providerId, providerName, providerLogo }
            : s
        )
      );
    } else {
      // Add new service
      const newService: Service = {
        id: `srv-${Date.now()}`,
        providerId,
        providerName,
        providerLogo,
        title: data.title || 'Untitled Service',
        description: data.description || '',
        category: data.category || 'Other',
        availability: data.availability || 'By appointment',
        tags: data.tags || [],
        deliveryType: data.deliveryType || 'On-site',
        priceInfo: data.priceInfo || 'Contact for quote',
        imageUrl: file ? URL.createObjectURL(file) : `https://picsum.photos/seed/newSrv${Date.now()}/400/300`,
        ...(data as Partial<Service>), // Spread remaining data which is already partial
      };
      setServiceListings(prev => [newService, ...prev]);
    }
  };

  const handleDeleteService = (serviceId: string) => {
    if (window.confirm(t('serviceProviderListingsPage.confirmDelete'))) {
      setServiceListings(prev => prev.filter(s => s.id !== serviceId));
    }
  };
  
  const filteredServiceListings = useMemo(() => {
    return serviceListings.filter(service => 
        (service.title.toLowerCase().includes(searchTerm.toLowerCase()) || service.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'All' || service.category === filterCategory)
    );
  }, [serviceListings, searchTerm, filterCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('serviceProviderListingsPage.title')}</h1>
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => handleOpenModal()}>
          {t('serviceProviderListingsPage.addNewServiceButton')}
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder={t('serviceProviderListingsPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={STANDARD_INPUT_FIELD}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ServiceCategory | 'All')}
            className={STANDARD_INPUT_FIELD}
          >
            {serviceCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </Card>
      
      {filteredServiceListings.length === 0 ? (
        <Card className="p-10 text-center">
             <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('serviceProviderListingsPage.emptyState.title')}</h2>
            <p className="text-gray-500">
                {serviceListings.length > 0 ? t('serviceProviderListingsPage.emptyState.noMatch') : t('serviceProviderListingsPage.emptyState.noServicesYet')}
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