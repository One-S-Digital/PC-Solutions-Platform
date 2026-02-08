import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Organization, Product, Service, UserRole, StockStatus, ServiceRequest, ServiceRequestStatus, OrganizationType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ServiceRequestModal from '../../components/marketplace/ServiceRequestModal';
import QuantityInput from '../../components/ui/QuantityInput';
import { 
  ArrowLeftIcon, 
  CogIcon, 
  ShoppingCartIcon, 
  StarIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  GlobeAltIcon, 
  MapPinIcon, 
  PlusCircleIcon, 
  ListBulletIcon, 
  ArrowTopRightOnSquareIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useOrganizationMessaging } from '../../hooks/useOrganizationMessaging';
import ActiveClientToggle from '../../components/shared/ActiveClientToggle';
import OrganizationDocumentsList from '../../components/profile/OrganizationDocumentsList';
import PromoCodesDisplaySection from '../../components/profile/PromoCodesDisplaySection';
import { formatServiceCategoryForService, formatServiceDeliveryType, formatCategory } from '../../utils/serviceFormatting';
import { openExternalUrl, toExternalUrl } from '../../utils/url';
import { organizationService } from '../../services/organizationService';

interface ProductItemProps {
  product: Product;
  partner: Organization;
  isFoundationUser: boolean;
  onAddToCart: (product: Product, quantity: number, supplier: Organization) => void;
}

const ProductItemCard: React.FC<ProductItemProps> = ({ product, partner, isFoundationUser, onAddToCart }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [quantity, setQuantity] = useState(1);

  const getStockStatusColor = (status?: string) => {
    if (status === 'In Stock' || status === 'ACTIVE') return 'text-green-600';
    if (status === 'Low Stock') return 'text-orange-500';
    if (status === 'Out of Stock' || status === 'OUT_OF_STOCK') return 'text-red-500';
    return 'text-gray-500';
  };

  const getStockStatusLabel = (status?: string) => {
    if (status === 'ACTIVE' || !status) return t('stockStatus.instock', 'In Stock');
    const statusKey = status.replace(/\s+/g, '').toLowerCase();
    return t(`stockStatus.${statusKey}`, status);
  };
  
  const handleAddToCartClick = () => {
    if (product.stockStatus === 'Out of Stock' || product.stockStatus === 'OUT_OF_STOCK') {
      alert(t('partnerDetailPage.productOutOfStock', { productName: product.title }));
      return;
    }
    onAddToCart(product, quantity, partner);
    alert(t('partnerDetailPage.productAddedToOrder', { quantity, productName: product.title }));
  };

  const imageUrl = product.imageUrl || product.imageAsset?.publicUrl || `https://picsum.photos/seed/${product.id}/100/100`;

  return (
    <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 group hover:shadow-md transition-shadow">
      <img 
        src={imageUrl} 
        alt={product.title} 
        className="w-full sm:w-24 h-24 object-cover rounded-md flex-shrink-0" 
      />
      <div className="flex-grow">
        <h3 className="text-md font-semibold text-swiss-charcoal group-hover:text-swiss-mint">{product.title}</h3>
        <p className="text-xs text-gray-500">{formatCategory(product.category || product.primaryCategory)}</p>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
        <div className="flex items-center space-x-3 mt-1.5">
          {product.price && (
            <p className="text-md font-semibold text-swiss-teal">
              {product.priceCurrency || 'CHF'} {product.price.toFixed(2)}
            </p>
          )}
          <p className={`text-xs font-medium ${getStockStatusColor(product.stockStatus || product.availabilityStatus)}`}>
            {getStockStatusLabel(product.stockStatus || product.availabilityStatus)}
          </p>
        </div>
      </div>
      {isFoundationUser && (
        <div className="mt-2 sm:mt-0 sm:ml-auto flex flex-col items-end space-y-2 flex-shrink-0">
          <QuantityInput 
            quantity={quantity} 
            onQuantityChange={setQuantity}
            stockStatus={product.stockStatus as StockStatus}
          />
          <Button 
            variant="primary" 
            size="sm" 
            leftIcon={ShoppingCartIcon}
            onClick={handleAddToCartClick}
            disabled={product.stockStatus === 'Out of Stock' || product.stockStatus === 'OUT_OF_STOCK'}
            className="w-full sm:w-auto"
          >
            {t('partnerDetailPage.addToOrderButton')}
          </Button>
        </div>
      )}
    </Card>
  );
};

// Loading skeleton for products/services
const ItemSkeleton: React.FC = () => (
  <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-pulse">
    <div className="w-full sm:w-24 h-24 bg-gray-200 rounded-md flex-shrink-0" />
    <div className="flex-grow space-y-2">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
    </div>
  </Card>
);

const PartnerDetailPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const cart = useCart();
  const { sendMessageToOrganization } = useOrganizationMessaging();
  
  const [partner, setPartner] = useState<Organization | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<Service | null>(null);
  
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  // Fetch partner data from API
  const fetchPartnerData = useCallback(async () => {
    if (!partnerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const partnerData = await organizationService.getOrganizationById(partnerId);
      setPartner(partnerData);
      
      // Set products and services based on organization type
      if (partnerData.type === OrganizationType.PRODUCT_SUPPLIER) {
        setProducts(partnerData.products || []);
        setServices([]);
      } else if (partnerData.type === OrganizationType.SERVICE_PROVIDER) {
        setServices(partnerData.services || []);
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to fetch partner data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partner details');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchPartnerData();
  }, [fetchPartnerData]);
  
  const isFoundationUser = currentUser?.role === UserRole.FOUNDATION;
  const isVendorUser = currentUser?.role === UserRole.PRODUCT_SUPPLIER || currentUser?.role === UserRole.SERVICE_PROVIDER;
  
  const isSupplier = partner?.type === OrganizationType.PRODUCT_SUPPLIER;
  const isServiceProvider = partner?.type === OrganizationType.SERVICE_PROVIDER;

  const handleSendMessage = async () => {
    if (!partner || !currentUser) return;
    const fallbackRole = isSupplier ? UserRole.PRODUCT_SUPPLIER : UserRole.SERVICE_PROVIDER;
    await sendMessageToOrganization(partner, fallbackRole);
  };

  const handleOpenServiceRequestModal = (service: Service) => {
    if (!isFoundationUser) {
      alert(t('partnerDetailPage.onlyFoundationsRequestService'));
      return;
    }
    setSelectedServiceForRequest(service);
    setIsServiceRequestModalOpen(true);
  };

  const handleSubmitServiceRequest = (requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId' | 'providerId' | 'serviceName' | 'serviceId'>) => {
    const newRequest: ServiceRequest = {
      ...requestData,
      id: `servreq_${Date.now()}`,
      foundationId: currentUser!.id,
      foundationOrgId: currentUser!.orgId!,
      providerId: partner!.id,
      serviceId: selectedServiceForRequest!.id,
      serviceName: selectedServiceForRequest!.title,
      requestDate: new Date().toISOString(),
      status: ServiceRequestStatus.NEW,
    };
    setServiceRequests(prev => [...prev, newRequest]);
    console.log("New Service Request Submitted:", newRequest);
    setIsServiceRequestModalOpen(false);
    alert(t('partnerDetailPage.requestSubmittedAlert', { serviceName: newRequest.serviceName }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
          {t('common:buttons.goBack')}
        </Button>
        
        <Card className="overflow-hidden animate-pulse">
          <div className="w-full aspect-[4/1] bg-gray-200" />
          <div className="p-6 pt-28 sm:pt-6 sm:pl-36">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-20" />
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-4">
                <ItemSkeleton />
                <ItemSkeleton />
                <ItemSkeleton />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !partner) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
          {t('common:buttons.goBack')}
        </Button>
        
        <div className="p-6 text-center">
          <CogIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-gray-600">{error || t('partnerDetailPage.invalidPartnerIdMessage')}</p>
          <Button 
            variant="outline" 
            leftIcon={ArrowPathIcon} 
            onClick={fetchPartnerData} 
            className="mt-4"
          >
            {t('common:buttons.retry', 'Retry')}
          </Button>
        </div>
      </div>
    );
  }

  const partnerTypeLabel = isSupplier 
    ? t('common:userRoles.Product Supplier') 
    : isServiceProvider 
      ? t('common:userRoles.Service Provider') 
      : t('common:userRoles.Foundation');

  const coverImageUrl = partner.coverImageUrl || `https://picsum.photos/seed/${partner.id}Cover/1200/300`;
  const logoUrl = partner.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&background=E0E7FF&color=4F46E5&size=128`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
        {t('common:buttons.goBack')}
      </Button>

      {/* Header Section */}
      <Card className="overflow-hidden">
        <div className="w-full aspect-[4/1] bg-gray-200 relative">
          <img 
            src={coverImageUrl} 
            alt={`${partner.name} cover`} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <img 
            src={logoUrl} 
            alt={`${partner.name} logo`} 
            className="absolute bottom-4 left-6 w-28 h-28 rounded-full border-4 border-white shadow-lg bg-white object-contain" 
          />
        </div>
        <div className="p-6 pt-28 sm:pt-6 sm:pl-36 flex flex-col sm:flex-row items-center sm:items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-swiss-charcoal">{partner.name}</h1>
            <p className="text-gray-500">{partnerTypeLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...(partner.tags || []), ...(partner.productCategories || []), ...(partner.serviceCategories || [])]
                .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                .slice(0, 5)
                .map(tag => (
                  <span key={tag} className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
            </div>
          </div>
          {isFoundationUser && (
            <div className="mt-4 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center flex-shrink-0">
              <Button 
                variant="outline" 
                leftIcon={EnvelopeIcon} 
                size="md" 
                className="w-full sm:w-auto" 
                onClick={handleSendMessage}
              >
                {t('common:buttons.sendMessage')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {isVendorUser && partner.type === 'FOUNDATION' && currentUser?.orgId && (
            <ActiveClientToggle vendorId={currentUser.orgId} orgId={partner.id} />
          )}
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">
              {t('partnerDetailPage.contactInfoTitle')}
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              {(partner.region || partner.canton) && (
                <p className="flex items-start">
                  <MapPinIcon className="w-5 h-5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" /> 
                  {`${partner.region || partner.canton}, Switzerland`}
                </p>
              )}
              {partner.phoneNumber && (
                <p className="flex items-center">
                  <PhoneIcon className="w-5 h-5 mr-2 text-gray-400" /> 
                  <a href={`tel:${partner.phoneNumber}`} className="hover:text-swiss-mint">
                    {partner.phoneNumber}
                  </a>
                </p>
              )}
              {partner.contactPerson && (
                <p className="flex items-center">
                  <UserCircleIcon className="w-5 h-5 mr-2 text-gray-400" /> 
                  {partner.contactPerson}
                </p>
              )}
              {(partner.catalogUrl || partner.bookingLink || partner.directOrderLink) && (
                <p className="flex items-center">
                  <GlobeAltIcon className="w-5 h-5 mr-2 text-gray-400" /> 
                  <a 
                    href={toExternalUrl(partner.catalogUrl || partner.bookingLink || partner.directOrderLink) ?? undefined} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-swiss-mint truncate"
                  >
                    {partner.catalogUrl || partner.bookingLink || partner.directOrderLink}
                  </a>
                </p>
              )}
            </div>
            {isFoundationUser && isSupplier && partner.directOrderLink && (
              <Button 
                variant="secondary" 
                leftIcon={ArrowTopRightOnSquareIcon} 
                onClick={() => openExternalUrl(partner.directOrderLink)}
                className="w-full mt-4"
              >
                {t('partnerDetailPage.directOrderButton')}
              </Button>
            )}
          </Card>
          
          {partner.description && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">
                {t('partnerDetailPage.aboutTitle', { partnerName: partner.name })}
              </h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{partner.description}</p>
            </Card>
          )}

          {/* Promo Codes Section - Display available promo codes */}
          {(isSupplier || isServiceProvider) && (
            <PromoCodesDisplaySection organizationId={partner.id} isOwnProfile={false} />
          )}
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">
              {t('partnerDetailPage.ratingsReviewsTitle')}
            </h2>
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <StarIcon 
                  key={i} 
                  className={`w-5 h-5 ${i < (partner.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                />
              ))}
              {partner.rating && (
                <span className="ml-2 text-sm text-gray-600">
                  {t('partnerDetailPage.ratingText', { rating: partner.rating.toFixed(1) })}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{t('dashboard:partnerDetailPage.reviewsPlaceholder', 'No reviews yet')}</p>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
              {isSupplier ? (
                <ShoppingCartIcon className="w-6 h-6 mr-2 text-swiss-mint" />
              ) : (
                <ListBulletIcon className="w-6 h-6 mr-2 text-swiss-mint" />
              )}
              {isSupplier ? t('dashboard:sidebar.products') : t('dashboard:sidebar.services')}
            </h2>
            
            {isSupplier && (
              products.length > 0 ? (
                <div className="space-y-4">
                  {products.map(product => (
                    <ProductItemCard 
                      key={product.id} 
                      product={product} 
                      partner={partner}
                      isFoundationUser={isFoundationUser} 
                      onAddToCart={cart.addToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCartIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t('dashboard:partnerDetailPage.noProductsListed', 'No products listed')}</p>
                </div>
              )
            )}

            {isServiceProvider && (
              services.length > 0 ? (
                <div className="space-y-4">
                  {services.map(service => (
                    <Card 
                      key={service.id} 
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 group hover:shadow-md transition-shadow"
                    >
                      <img 
                        src={service.imageUrl || `https://picsum.photos/seed/${service.id}/100/100`} 
                        alt={service.title} 
                        className="w-full sm:w-24 h-24 object-cover rounded-md flex-shrink-0" 
                      />
                      <div className="flex-grow">
                        <h3 className="text-md font-semibold text-swiss-charcoal group-hover:text-swiss-teal">
                          {service.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatServiceCategoryForService(t, service)}
                          {service.deliveryType && <> • {formatServiceDeliveryType(t, service.deliveryType)}</>}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                        {service.priceInfo && (
                          <p className="text-md font-semibold text-swiss-mint mt-1.5">{service.priceInfo}</p>
                        )}
                        {service.price && !service.priceInfo && (
                          <p className="text-md font-semibold text-swiss-mint mt-1.5">CHF {service.price}</p>
                        )}
                      </div>
                      {isFoundationUser && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          leftIcon={PlusCircleIcon} 
                          onClick={() => handleOpenServiceRequestModal(service)} 
                          className="mt-2 sm:mt-0 sm:ml-auto flex-shrink-0"
                        >
                          {t('partnerDetailPage.requestServiceButton')}
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <WrenchScrewdriverIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t('dashboard:partnerDetailPage.noServicesListed', 'No services listed')}</p>
                </div>
              )
            )}
          </Card>

          {/* Documents Section - For Suppliers and Service Providers */}
          {(isSupplier || isServiceProvider) && (
            <OrganizationDocumentsList organizationId={partner.id} />
          )}
        </div>
      </div>
      
      <ServiceRequestModal
        isOpen={isServiceRequestModalOpen}
        onClose={() => setIsServiceRequestModalOpen(false)}
        service={selectedServiceForRequest}
        onSubmitRequest={handleSubmitServiceRequest}
      />
    </div>
  );
};

export default PartnerDetailPage;
