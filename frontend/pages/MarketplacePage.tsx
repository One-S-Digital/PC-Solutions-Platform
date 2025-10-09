

import React, { useState, useMemo, useEffect } from 'react';
import { Organization, Service, OrderRequest, UserRole, Product, ServiceRequest, ServiceRequestStatus } from '../types';
import { MOCK_PRODUCTS, MOCK_SERVICES, MOCK_ORGANIZATIONS, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD, MOCK_SERVICE_REQUESTS } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { BuildingStorefrontIcon, WrenchScrewdriverIcon, TagIcon, FunnelIcon, MagnifyingGlassIcon, ListBulletIcon, Squares2X2Icon, InformationCircleIcon, ChevronDownIcon, EyeIcon, StarIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import ServiceRequestModal from '../components/marketplace/ServiceRequestModal';
import SupplierCard from '../components/marketplace/SupplierCard'; 
import { useAppContext } from '../contexts/AppContext'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ServiceCard now includes a function to book an appointment
const ServiceCard: React.FC<{ service: Service, onViewProvider: (providerId: string) => void, onBookAppointment: (service: Service) => void }> = ({ service, onViewProvider, onBookAppointment }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  return (
  <Card className="flex flex-col group" hoverEffect>
     <div className="relative overflow-hidden aspect-video cursor-pointer" onClick={() => onViewProvider(service.providerId)}>
        <img src={service.imageUrl || 'https://picsum.photos/seed/serviceY/400/300'} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    </div>
    <div className="p-5 flex flex-col flex-grow">
      <h3 className="text-lg font-semibold text-swiss-charcoal mb-1 group-hover:text-swiss-teal transition-colors cursor-pointer" onClick={() => onViewProvider(service.providerId)}>{service.title}</h3>
       <div className="flex items-center text-xs text-gray-500 mb-2">
        <img src={service.providerLogo || 'https://picsum.photos/seed/provLogo/50/50'} alt={service.providerName} className="w-5 h-5 rounded-full mr-1.5 border border-gray-200" />
        <button onClick={() => onViewProvider(service.providerId)} className="hover:underline focus:outline-none">{service.providerName}</button>
      </div>
      <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-3">{service.description}</p>
      <div className="text-xs text-gray-500 mb-1">
        <TagIcon className="w-3.5 h-3.5 inline mr-1 opacity-70" /> {t('serviceCard.categoryLabel', { category: service.category })}
      </div>
      {service.priceInfo && <p className="text-sm font-semibold text-swiss-mint mb-3">{service.priceInfo}</p>}
       <div className="mb-4">
        {service.tags.slice(0,3).map(tag => <span key={tag} className="text-xs bg-swiss-mint/10 text-swiss-mint px-2.5 py-1 rounded-full mr-1.5 mb-1 inline-block font-medium">{tag}</span>)}
      </div>
      <div className="flex space-x-2 mt-auto">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => onBookAppointment(service)}>{t('serviceCard.bookAppointment')}</Button>
        <Button variant="outline" size="sm" leftIcon={EyeIcon} onClick={() => onViewProvider(service.providerId)}>{t('serviceCard.viewProvider')}</Button>
      </div>
    </div>
  </Card>
  );
};

const getActiveTabFromPath = (path: string) => {
  if (path.includes('/services')) return 1;
  return 0; // Default to products
};

const MarketplacePage: React.FC = () => {
  const { t } = useTranslation(['marketplace', 'common']);
  const { currentUser, submitServiceRequest } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTabIndex, setActiveTabIndex] = useState(() => getActiveTabFromPath(location.pathname));
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All'); 
  const [tagFilter, setTagFilter] = useState('All');
  const [sortOption, setSortOption] = useState('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<Service | null>(null);
  
  // Effect to sync tab with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const newIndex = getActiveTabFromPath(location.pathname);
    if (newIndex !== activeTabIndex) {
      setActiveTabIndex(newIndex);
      // Reset filters when tab changes to avoid confusion
      setSearchTerm('');
      setCategoryFilter('All');
      setRegionFilter('All');
      setTagFilter('All');
      setSortOption('name_asc');
    }
  }, [location.pathname, activeTabIndex]);

  const handleOpenServiceRequestModal = (service: Service) => {
    if (currentUser?.role !== UserRole.FOUNDATION) {
      alert(t('partnerDetailPage.onlyFoundationsRequestService'));
      return;
    }
    setSelectedServiceForRequest(service);
    setIsServiceRequestModalOpen(true);
  };
  
  const handleSubmitServiceRequest = (requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId' | 'providerId' | 'serviceName' | 'serviceId'>) => {
    if (!currentUser || !currentUser.orgId || !selectedServiceForRequest) return;
     const newRequest = {
        ...requestData,
        providerId: selectedServiceForRequest.providerId,
        serviceId: selectedServiceForRequest.id,
        serviceName: selectedServiceForRequest.title,
    };
    submitServiceRequest(newRequest);
    setIsServiceRequestModalOpen(false);
    alert(t('partnerDetailPage.requestSubmittedAlert', {serviceName: newRequest.serviceName}));
  };

  const activeTabLabel = useMemo(() => {
    return activeTabIndex === 0 
      ? t('tabs.productSuppliers') 
      : t('tabs.serviceProviders');
  }, [activeTabIndex, t]);

  const productSuppliers = useMemo(() => MOCK_ORGANIZATIONS.filter(org => org.type === 'supplier'), []);
  const serviceProviders = useMemo(() => MOCK_ORGANIZATIONS.filter(org => org.type === 'service_provider'), []);

  const supplierProductCategories = useMemo(() => {
    const categories = new Set<string>();
    productSuppliers.forEach(supplier => {
      MOCK_PRODUCTS.filter(p => p.supplierId === supplier.id).forEach(p => categories.add(p.category));
    });
    return ['All', ...Array.from(categories).sort()];
  }, [productSuppliers]);

  const supplierTags = useMemo(() => {
    const tags = new Set<string>();
    productSuppliers.forEach(supplier => {
      (supplier.tags || []).forEach(tag => tags.add(tag));
    });
    return ['All', ...Array.from(tags).sort()];
  }, [productSuppliers]);
  
  const serviceProviderCategories = useMemo(() => ['All', ...new Set(MOCK_SERVICES.map(s => s.category))], []);
  const allRegions = useMemo(() => ['All', ...new Set(MOCK_ORGANIZATIONS.map(org => org.region).sort())], []);

  const currentCategories = activeTabIndex === 0 ? supplierProductCategories : serviceProviderCategories;
  const currentTags = activeTabIndex === 0 ? supplierTags : [];

  const filteredSuppliers = useMemo(() => {
    return productSuppliers
      .filter(supplier =>
        (supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (supplier.tags && supplier.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
         MOCK_PRODUCTS.filter(p => p.supplierId === supplier.id).some(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
         )
        ) &&
        (regionFilter === 'All' || supplier.region === regionFilter) &&
        (categoryFilter === 'All' || MOCK_PRODUCTS.filter(p => p.supplierId === supplier.id).some(p => p.category === categoryFilter)) &&
        (tagFilter === 'All' || (supplier.tags && supplier.tags.includes(tagFilter)))
      )
      .sort((a, b) => {
        switch (sortOption) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'rating_desc': return (b.rating || 0) - (a.rating || 0);
          default: return 0;
        }
      });
  }, [searchTerm, regionFilter, categoryFilter, tagFilter, sortOption, productSuppliers]);

  const filteredServices = useMemo(() =>
    MOCK_SERVICES.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (categoryFilter === 'All' || s.category === categoryFilter) &&
      (regionFilter === 'All' || serviceProviders.find(p => p.id === s.providerId)?.region === regionFilter)
    ), [searchTerm, categoryFilter, regionFilter, serviceProviders]);


  const handleViewPartner = (partnerId: string) => {
    navigate(`/partner/${partnerId}`);
  };
  
  const handleTabChange = (index: number) => {
    if (index === 0) {
      navigate('/marketplace/products');
    } else if (index === 1) {
      navigate('/marketplace/services');
    }
  };

  const tabsConfig = [
    { label: t('tabs.productSuppliers'), icon: BuildingStorefrontIcon, content: (
      <>
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredSuppliers.map(supplier => 
            <SupplierCard key={supplier.id} supplier={supplier} onViewProfile={handleViewPartner} />
          )}
        </div>
        {filteredSuppliers.length === 0 && <p className="text-center text-gray-500 py-12">{t('emptyStates.noProductSuppliers')}</p>}
      </>
    )},
    { label: t('tabs.serviceProviders'), icon: WrenchScrewdriverIcon, content: ( 
      <>
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredServices.map(service => 
            <ServiceCard key={service.id} service={service} onViewProvider={handleViewPartner} onBookAppointment={handleOpenServiceRequestModal}/>
          )}
        </div>
         {filteredServices.length === 0 && <p className="text-center text-gray-500 py-12">{t('emptyStates.noServices')}</p>}
      </>
    )},
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold text-swiss-charcoal">
                {activeTabLabel}
            </h1>
            {activeTabIndex === 0 && 
                <p className="text-gray-500 mt-1">{t('subtitles.productSuppliers')}</p>
            }
            {activeTabIndex === 1 &&
                 <p className="text-gray-500 mt-1">{t('subtitles.serviceProviders')}</p>
            }
        </div>
        {currentUser?.role === UserRole.ADMIN && <Button variant="secondary" leftIcon={FunnelIcon} size="md" onClick={() => alert("Partner Onboarding TBD")}>{t('buttons.partnerOnboarding')}</Button>}
      </div>
      
      <div className="bg-swiss-teal/5 border-l-4 border-swiss-teal text-swiss-teal p-4 rounded-card flex items-start" role="alert">
        <InformationCircleIcon className="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0"/>
        <p className="text-sm">
          {t('infoAlert')}
        </p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="relative lg:col-span-2">
             <label htmlFor="searchMarketplace" className="sr-only">{t('searchPlaceholder', { activeTabLabel: activeTabLabel.toLowerCase() })}</label>
             <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
             <input 
                type="text" 
                id="searchMarketplace"
                placeholder={t('searchPlaceholder', { activeTabLabel: activeTabLabel.toLowerCase() })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={ICON_INPUT_FIELD}
            />
          </div>
          <div>
            <label htmlFor="categoryFilterMarketplace" className="block text-xs font-medium text-gray-500 mb-1">{t('labels.category')}</label>
            <select 
                id="categoryFilterMarketplace"
                value={categoryFilter} 
                onChange={(e) => {setCategoryFilter(e.target.value);}}
                className={STANDARD_INPUT_FIELD}
            >
                {currentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="regionFilterMarketplace" className="block text-xs font-medium text-gray-500 mb-1">{t('labels.region')}</label>
            <select 
                id="regionFilterMarketplace"
                value={regionFilter} 
                onChange={(e) => setRegionFilter(e.target.value)}
                className={STANDARD_INPUT_FIELD}
            >
                {allRegions.map(reg => <option key={reg} value={reg}>{reg}</option>)}
            </select>
          </div>
          {activeTabIndex === 0 && (
            <>
              <div>
                <label htmlFor="tagFilterMarketplace" className="block text-xs font-medium text-gray-500 mb-1">{t('labels.supplierTags')}</label>
                <select 
                    id="tagFilterMarketplace"
                    value={tagFilter} 
                    onChange={(e) => setTagFilter(e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                >
                    {(currentTags as string[]).map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
               <div>
                <label htmlFor="sortOptionMarketplace" className="block text-xs font-medium text-gray-500 mb-1">{t('labels.sortBy')}</label>
                <select 
                    id="sortOptionMarketplace"
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                >
                    <option value="name_asc">{t('sortOptions.nameAsc')}</option>
                    <option value="name_desc">{t('sortOptions.nameDesc')}</option>
                    <option value="rating_desc">{t('sortOptions.ratingDesc')}</option>
                </select>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-1 border border-gray-300 rounded-button p-0.5 bg-gray-100">
                <Button 
                    variant={viewMode === 'grid' ? 'light' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('grid')}
                    className={`${viewMode === 'grid' ? 'bg-white shadow-sm' : 'shadow-none'}`}
                    aria-pressed={viewMode === 'grid'}
                    aria-label={t('ariaLabels.gridView')}
                >
                    <Squares2X2Icon className="w-5 h-5"/>
                </Button>
                 <Button 
                    variant={viewMode === 'list' ? 'light' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('list')}
                    className={`${viewMode === 'list' ? 'bg-white shadow-sm' : 'shadow-none'}`}
                    aria-pressed={viewMode === 'list'}
                    aria-label={t('ariaLabels.listView')}
                >
                    <ListBulletIcon className="w-5 h-5"/>
                </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setCategoryFilter('All'); setRegionFilter('All'); setTagFilter('All'); setSortOption('name_asc');}}>{t('buttons.resetFilters')}</Button>
        </div>
      </Card>

      <Tabs 
        tabs={tabsConfig} 
        variant="pills" 
        className="mt-6"
        activeTab={activeTabIndex}
        onTabChange={handleTabChange}
      />

       <ServiceRequestModal
        isOpen={isServiceRequestModalOpen}
        onClose={() => setIsServiceRequestModalOpen(false)}
        service={selectedServiceForRequest}
        onSubmitRequest={handleSubmitServiceRequest}
      />

    </div>
  );
};

export default MarketplacePage;