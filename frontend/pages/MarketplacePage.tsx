import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Organization, Service, UserRole, Product, ServiceRequest, ServiceRequestStatus, OrganizationType } from '../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import RatingStars from '../components/ui/RatingStars';
import { BuildingStorefrontIcon, WrenchScrewdriverIcon, TagIcon, FunnelIcon, MagnifyingGlassIcon, ListBulletIcon, Squares2X2Icon, InformationCircleIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ServiceRequestModal from '../components/marketplace/ServiceRequestModal';
import SupplierCard from '../components/marketplace/SupplierCard'; 
import { useAppContext } from '../contexts/AppContext'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatServiceCategory, formatServiceDeliveryType } from '../utils/serviceFormatting';
import { marketplaceService } from '../services/marketplaceService';

// Loading skeleton component
const CardSkeleton: React.FC = () => (
  <Card className="flex flex-col animate-pulse">
    <div className="relative p-4 border-b border-gray-200 bg-gray-50/50">
      <div className="w-20 h-20 rounded-full mx-auto bg-gray-200" />
    </div>
    <div className="p-5 flex flex-col flex-grow">
      <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-3" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-4" />
      <div className="h-10 bg-gray-200 rounded w-full mt-auto" />
    </div>
  </Card>
);

// Service Provider Card Component
const ServiceProviderCard: React.FC<{ 
  provider: Organization; 
  onViewProfile: (providerId: string) => void;
}> = ({ provider, onViewProfile }) => {
  const { t } = useTranslation(['dashboard', 'common']);

  // Get service categories from the provider
  const getServiceCategories = () => {
    if (provider.serviceCategories && provider.serviceCategories.length > 0) {
      return provider.serviceCategories.slice(0, 2).join(', ') + (provider.serviceCategories.length > 2 ? '...' : '');
    }
    if (provider.serviceType) {
      return provider.serviceType;
    }
    if (provider.services && provider.services.length > 0) {
      const categories = [...new Set(provider.services.map(s => s.category))];
      return categories.slice(0, 2).map(cat => formatServiceCategory(t, cat)).join(', ');
    }
    return t('common:marketplace.variousServices', 'Various Services');
  };

  return (
    <Card className="flex flex-col group" hoverEffect>
      <div className="relative p-4 border-b border-gray-200 bg-gray-50/50">
        <img 
          src={provider.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=D1FAE5&color=059669&size=128`} 
          alt={`${provider.name} logo`} 
          className="w-20 h-20 rounded-full mx-auto object-contain border-2 border-white shadow-md bg-white"
        />
        {provider.badges && provider.badges.length > 0 && (
          <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
            provider.badges[0].toLowerCase().includes('verified') ? 'bg-green-100 text-green-700' :
            provider.badges[0].toLowerCase().includes('promo') ? 'bg-red-100 text-red-700' :
            'bg-teal-100 text-teal-700'
          }`}>
            {provider.badges[0]}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-swiss-charcoal mb-1 text-center group-hover:text-swiss-teal transition-colors">
          {provider.name}
        </h3>
        <p className="text-xs text-gray-500 text-center mb-2 flex items-center justify-center">
          <WrenchScrewdriverIcon className="w-3.5 h-3.5 mr-1 opacity-70"/> {provider.region || 'Switzerland'}
        </p>
        <div className="text-center mb-3 flex justify-center">
          <RatingStars rating={provider.rating} />
        </div>
        
        <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-2 text-center">
          <TagIcon className="w-4 h-4 inline mr-1 opacity-60" /> 
          {getServiceCategories()}
        </p>

        {provider.deliveryType && (
          <p className="text-xs text-center text-gray-500 mb-3">
            {formatServiceDeliveryType(t, provider.deliveryType)}
          </p>
        )}
        
        <div className="mt-auto">
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full" 
            leftIcon={EyeIcon}
            onClick={() => onViewProfile(provider.id)}
          >
            {t('dashboard:supplierCard.viewProfileAndProducts', 'View Profile & Services')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string; icon: React.ElementType }> = ({ message, icon: Icon }) => (
  <div className="text-center py-12">
    <Icon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
    <p className="text-gray-500">{message}</p>
  </div>
);

const getActiveTabFromPath = (path: string) => {
  if (path.includes('/services')) return 1;
  return 0; // Default to products
};

const MarketplacePage: React.FC = () => {
  const { t } = useTranslation(['marketplace', 'common', 'dashboard']);
  const { currentUser, submitServiceRequest } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTabIndex, setActiveTabIndex] = useState(() => getActiveTabFromPath(location.pathname));
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All'); 
  const [tagFilter, setTagFilter] = useState('All');
  const [sortOption, setSortOption] = useState('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data state
  const [productSuppliers, setProductSuppliers] = useState<Organization[]>([]);
  const [serviceProviders, setServiceProviders] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<Service | null>(null);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Fetch data from API
  const fetchMarketplaceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [suppliersResult, providersResult] = await Promise.all([
        marketplaceService.getProductSuppliers({
          region: regionFilter !== 'All' ? regionFilter : undefined,
          search: debouncedSearchTerm || undefined,
          limit: 100,
        }),
        marketplaceService.getServiceProviders({
          region: regionFilter !== 'All' ? regionFilter : undefined,
          search: debouncedSearchTerm || undefined,
          limit: 100,
        }),
      ]);
      
      setProductSuppliers(suppliersResult.suppliers);
      setServiceProviders(providersResult.providers);
    } catch (err) {
      console.error('Failed to fetch marketplace data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  }, [regionFilter, debouncedSearchTerm]);

  // Initial data fetch
  useEffect(() => {
    fetchMarketplaceData();
  }, [fetchMarketplaceData]);
  
  // Effect to sync tab with URL changes
  useEffect(() => {
    const newIndex = getActiveTabFromPath(location.pathname);
    if (newIndex !== activeTabIndex) {
      setActiveTabIndex(newIndex);
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

  // Extract categories from suppliers
  const supplierProductCategories = useMemo(() => {
    const categories = new Set<string>();
    productSuppliers.forEach(supplier => {
      if (supplier.productCategories) {
        supplier.productCategories.forEach(cat => categories.add(cat));
      }
      if (supplier.products) {
        supplier.products.forEach(p => {
          if (p.categories) {
            p.categories.forEach(cat => categories.add(cat));
          } else if (p.category) {
            categories.add(p.category);
          }
        });
      }
    });
    return ['All', ...Array.from(categories).sort()];
  }, [productSuppliers]);

  // Extract tags from suppliers
  const supplierTags = useMemo(() => {
    const tags = new Set<string>();
    productSuppliers.forEach(supplier => {
      (supplier.tags || []).forEach(tag => tags.add(tag));
      (supplier.productCategories || []).forEach(cat => tags.add(cat));
    });
    return ['All', ...Array.from(tags).sort()];
  }, [productSuppliers]);
  
  // Extract service categories from providers
  const serviceProviderCategories = useMemo(() => {
    const categories = new Set<string>();
    serviceProviders.forEach(provider => {
      if (provider.serviceCategories) {
        provider.serviceCategories.forEach(cat => categories.add(cat));
      }
      if (provider.services) {
        provider.services.forEach(s => {
          if (s.categories) {
            s.categories.forEach(cat => categories.add(cat));
          } else if (s.category) {
            categories.add(String(s.category));
          }
        });
      }
    });
    return ['All', ...Array.from(categories).sort()];
  }, [serviceProviders]);

  // Extract all regions
  const allRegions = useMemo(() => {
    const regions = new Set<string>();
    [...productSuppliers, ...serviceProviders].forEach(org => {
      if (org.region) regions.add(org.region);
      if (org.canton) regions.add(org.canton);
      if (org.regionsServed) {
        org.regionsServed.forEach(r => regions.add(r));
      }
    });
    return ['All', ...Array.from(regions).sort()];
  }, [productSuppliers, serviceProviders]);

  const currentCategories = activeTabIndex === 0 ? supplierProductCategories : serviceProviderCategories;
  const currentTags = activeTabIndex === 0 ? supplierTags : [];

  // Filter and sort suppliers
  const filteredSuppliers = useMemo(() => {
    return productSuppliers
      .filter(supplier => {
        // Category filter
        const matchesCategory = categoryFilter === 'All' || 
          (supplier.productCategories && supplier.productCategories.includes(categoryFilter)) ||
          (supplier.products && supplier.products.some(p => 
            (p.categories && p.categories.includes(categoryFilter)) ||
            p.category === categoryFilter
          ));
        
        // Tag filter
        const matchesTag = tagFilter === 'All' || 
          (supplier.tags && supplier.tags.includes(tagFilter)) ||
          (supplier.productCategories && supplier.productCategories.includes(tagFilter));
        
        return matchesCategory && matchesTag;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'rating_desc': return (b.rating || 0) - (a.rating || 0);
          default: return 0;
        }
      });
  }, [productSuppliers, categoryFilter, tagFilter, sortOption]);

  // Filter and sort service providers
  const filteredProviders = useMemo(() => {
    return serviceProviders
      .filter(provider => {
        // Category filter
        const matchesCategory = categoryFilter === 'All' || 
          (provider.serviceCategories && provider.serviceCategories.includes(categoryFilter)) ||
          (provider.services && provider.services.some(s => 
            (s.categories && s.categories.includes(categoryFilter)) ||
            String(s.category) === categoryFilter
          ));
        
        return matchesCategory;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'rating_desc': return (b.rating || 0) - (a.rating || 0);
          default: return 0;
        }
      });
  }, [serviceProviders, categoryFilter, sortOption]);


  const handleViewPartner = (partnerId: string) => {
    navigate(`/partner/${partnerId}`);
  };
  
  const handleTabChange = (index: number) => {
    setCategoryFilter('All');
    setTagFilter('All');
    if (index === 0) {
      navigate('/marketplace/products');
    } else if (index === 1) {
      navigate('/marketplace/services');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setRegionFilter('All');
    setTagFilter('All');
    setSortOption('name_asc');
  };

  const gridClass = viewMode === 'grid' 
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
    : 'grid-cols-1';

  const tabsConfig = [
    { 
      label: t('tabs.productSuppliers'), 
      icon: BuildingStorefrontIcon, 
      content: (
        <>
          {loading ? (
            <div className={`grid gap-6 ${gridClass}`}>
              {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" leftIcon={ArrowPathIcon} onClick={fetchMarketplaceData}>
                {t('common:buttons.retry', 'Retry')}
              </Button>
            </div>
          ) : filteredSuppliers.length > 0 ? (
            <div className={`grid gap-6 ${gridClass}`}>
              {filteredSuppliers.map(supplier => 
                <SupplierCard key={supplier.id} supplier={supplier} onViewProfile={handleViewPartner} />
              )}
            </div>
          ) : (
            <EmptyState 
              message={t('emptyStates.noProductSuppliers')} 
              icon={BuildingStorefrontIcon} 
            />
          )}
        </>
      )
    },
    { 
      label: t('tabs.serviceProviders'), 
      icon: WrenchScrewdriverIcon, 
      content: ( 
        <>
          {loading ? (
            <div className={`grid gap-6 ${gridClass}`}>
              {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" leftIcon={ArrowPathIcon} onClick={fetchMarketplaceData}>
                {t('common:buttons.retry', 'Retry')}
              </Button>
            </div>
          ) : filteredProviders.length > 0 ? (
            <div className={`grid gap-6 ${gridClass}`}>
              {filteredProviders.map(provider => 
                <ServiceProviderCard 
                  key={provider.id} 
                  provider={provider} 
                  onViewProfile={handleViewPartner}
                />
              )}
            </div>
          ) : (
            <EmptyState 
              message={t('emptyStates.noServices')} 
              icon={WrenchScrewdriverIcon} 
            />
          )}
        </>
      )
    },
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
        {currentUser?.role === UserRole.ADMIN && (
          <Button 
            variant="secondary" 
            leftIcon={FunnelIcon} 
            size="md" 
            onClick={() => alert("Partner Onboarding TBD")}
          >
            {t('marketplace:buttons.partnerOnboarding')}
          </Button>
        )}
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
            <label htmlFor="searchMarketplace" className="sr-only">
              {t('searchPlaceholder', { activeTabLabel: activeTabLabel.toLowerCase() })}
            </label>
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
            <label htmlFor="categoryFilterMarketplace" className="block text-xs font-medium text-gray-500 mb-1">
              {t('labels.category')}
            </label>
            <select 
              id="categoryFilterMarketplace"
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={STANDARD_INPUT_FIELD}
            >
              {currentCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All'
                    ? t('common:filters.all')
                    : activeTabIndex === 1
                      ? formatServiceCategory(t, cat)
                      : cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="regionFilterMarketplace" className="block text-xs font-medium text-gray-500 mb-1">
              {t('labels.region')}
            </label>
            <select 
              id="regionFilterMarketplace"
              value={regionFilter} 
              onChange={(e) => setRegionFilter(e.target.value)}
              className={STANDARD_INPUT_FIELD}
            >
              {allRegions.map(reg => (
                <option key={reg} value={reg}>
                  {reg === 'All' ? t('common:filters.all') : reg}
                </option>
              ))}
            </select>
          </div>
          {activeTabIndex === 0 && (
            <>
              <div>
                <label htmlFor="tagFilterMarketplace" className="block text-xs font-medium text-gray-500 mb-1">
                  {t('labels.supplierTags')}
                </label>
                <select 
                  id="tagFilterMarketplace"
                  value={tagFilter} 
                  onChange={(e) => setTagFilter(e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                >
                  {(currentTags as string[]).map(tag => (
                    <option key={tag} value={tag}>
                      {tag === 'All' ? t('common:filters.all') : tag}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sortOptionMarketplace" className="block text-xs font-medium text-gray-500 mb-1">
                  {t('labels.sortBy')}
                </label>
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
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            {t('common:buttons.resetFilters')}
          </Button>
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
