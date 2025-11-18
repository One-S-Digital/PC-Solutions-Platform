

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Organization, Product, Service, UserRole, StockStatus, ServiceRequest, OrderRequestStatus, ServiceRequestStatus } from '../../types';
import { MOCK_ORGANIZATIONS, MOCK_PRODUCTS, MOCK_SERVICES, STANDARD_INPUT_FIELD, MOCK_ORDERS } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext'; // Import useCart
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
// OrderRequestModal is removed for product suppliers to use the new cart flow
import ServiceRequestModal from '../../components/marketplace/ServiceRequestModal';
import QuantityInput from '../../components/ui/QuantityInput'; // Import QuantityInput
import { ArrowLeftIcon, BuildingStorefrontIcon, CogIcon, ShoppingCartIcon, TagIcon, StarIcon, CheckCircleIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, PlusCircleIcon, BanknotesIcon, CubeIcon, ListBulletIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useMessaging } from '../../contexts/MessagingContext';
import ActiveClientToggle from '../../components/shared/ActiveClientToggle';
import { formatServiceCategory, formatServiceDeliveryType } from '../../utils/serviceFormatting';


interface ProductItemProps {
  product: Product;
  partner: Organization; // Supplier info
  isFoundationUser: boolean;
  onAddToCart: (product: Product, quantity: number, supplier: Organization) => void;
}

const ProductItemCard: React.FC<ProductItemProps> = ({ product, partner, isFoundationUser, onAddToCart }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [quantity, setQuantity] = useState(1);

  const getStockStatusColor = (status?: StockStatus) => {
    if (status === 'In Stock') return 'text-green-600';
    if (status === 'Low Stock') return 'text-orange-500';
    if (status === 'Out of Stock') return 'text-red-500';
    return 'text-gray-500';
  };
  
  const handleAddToCartClick = () => {
    if (product.stockStatus === 'Out of Stock') {
        alert(t('partnerDetailPage.productOutOfStock', {productName: product.title}));
        return;
    }
    onAddToCart(product, quantity, partner);
    // Optionally reset quantity to 1 after adding, or provide feedback
    // setQuantity(1); 
    alert(t('partnerDetailPage.productAddedToOrder', {quantity, productName: product.title}));
  };

  return (
    <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 group hover:shadow-md transition-shadow">
      <img src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} alt={product.title} className="w-full sm:w-24 h-24 object-cover rounded-md flex-shrink-0" />
      <div className="flex-grow">
        <h3 className="text-md font-semibold text-swiss-charcoal group-hover:text-swiss-mint">{product.title}</h3>
        <p className="text-xs text-gray-500">{product.category}</p>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
        <div className="flex items-center space-x-3 mt-1.5">
          {product.price && <p className="text-md font-semibold text-swiss-teal">CHF {product.price.toFixed(2)}</p>}
          {product.stockStatus && <p className={`text-xs font-medium ${getStockStatusColor(product.stockStatus)}`}>{t(`stockStatus.${product.stockStatus.replace(/\s+/g, '').toLowerCase()}`, product.stockStatus)}</p>}
        </div>
      </div>
      {isFoundationUser && (
        <div className="mt-2 sm:mt-0 sm:ml-auto flex flex-col items-end space-y-2 flex-shrink-0">
          <QuantityInput 
            quantity={quantity} 
            onQuantityChange={setQuantity}
            stockStatus={product.stockStatus}
            // max={product.stockAvailable} // If you have specific stock number
          />
          <Button 
            variant="primary" 
            size="sm" 
            leftIcon={ShoppingCartIcon} // Changed icon
            onClick={handleAddToCartClick}
            disabled={product.stockStatus === 'Out of Stock'}
            className="w-full sm:w-auto"
          >
            {t('partnerDetailPage.addToOrderButton')}
          </Button>
        </div>
      )}
    </Card>
  );
};


const PartnerDetailPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const cart = useCart(); // Use cart context
  const { startOrGetConversation } = useMessaging();
  
  const [partner, setPartner] = useState<Organization | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Removed OrderRequestModal states as it's not used for suppliers in cart flow
  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<Service | null>(null);
  
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]); // Using local state for service requests for now


  useEffect(() => {
    if (partnerId) {
      const foundPartner = MOCK_ORGANIZATIONS.find(org => org.id === partnerId);
      setPartner(foundPartner || null);

      if (foundPartner) {
        if (foundPartner.type === 'supplier') {
          setProducts(MOCK_PRODUCTS.filter(p => p.supplierId === partnerId));
          setServices([]);
        } else if (foundPartner.type === 'service_provider') {
          setServices(MOCK_SERVICES.filter(s => s.providerId === partnerId));
          setProducts([]);
        }
      }
    }
  }, [partnerId]);
  
  const isFoundationUser = currentUser?.role === UserRole.FOUNDATION;
  const isVendorUser = currentUser?.role === UserRole.PRODUCT_SUPPLIER || currentUser?.role === UserRole.SERVICE_PROVIDER;
  
  const partnerUser = useMemo(() => {
    if (!partner) return null;
    return null; // Production: fetch user data from API
  }, [partner]);


  const handleSendMessage = () => {
    if (!partnerUser) {
        alert("Could not find a user associated with this organization to message.");
        return;
    }
    const conversationId = startOrGetConversation(partnerUser.id, partnerUser.name, partnerUser.role);
    navigate(`/messages/${conversationId}`);
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
    setServiceRequests(prev => [...prev, newRequest]); // Manage mock service requests locally or via context if needed globally
    console.log("New Service Request Submitted:", newRequest);
    setIsServiceRequestModalOpen(false);
    alert(t('partnerDetailPage.requestSubmittedAlert', {serviceName: newRequest.serviceName}));
  };

  if (!partner) {
    return (
      <div className="p-6 text-center">
        <CogIcon className="w-12 h-12 mx-auto text-gray-400 animate-spin" />
        <p className="mt-4 text-gray-600">{t('partnerDetailPage.loadingPartnerDetails')}</p>
        <p className="text-sm text-gray-400">{t('partnerDetailPage.invalidPartnerIdMessage')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
        {t('buttons.goBack')}
      </Button>

      {/* Header Section */}
      <Card className="overflow-hidden">
        <div className="h-48 bg-gray-200 relative">
          <img src={partner.coverImageUrl || `https://picsum.photos/seed/${partner.id}Cover/1200/300`} alt={`${partner.name} cover`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <img src={partner.logoUrl || `https://picsum.photos/seed/${partner.id}/100/100`} alt={`${partner.name} logo`} className="absolute bottom-4 left-6 w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white" />
        </div>
        <div className="p-6 pt-28 sm:pt-6 sm:pl-36 flex flex-col sm:flex-row items-center sm:items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-swiss-charcoal">{partner.name}</h1>
              <p className="text-gray-500">{partner.type === 'supplier' ? t('userRoles.Product Supplier') : t('userRoles.Service Provider')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(partner.tags || []).map(tag => (
                  <span key={tag} className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
             {isFoundationUser && (
                 <div className="mt-4 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center flex-shrink-0">
                    <Button variant="outline" leftIcon={EnvelopeIcon} size="md" className="w-full sm:w-auto" onClick={handleSendMessage}>
                        {t('buttons.sendMessage')}
                    </Button>
                 </div>
             )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {isVendorUser && partner.type === 'foundation' && currentUser?.orgId && (
            <ActiveClientToggle vendorId={currentUser.orgId} orgId={partner.id} />
          )}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('partnerDetailPage.contactInfoTitle')}</h2>
            <div className="space-y-2 text-sm text-gray-700">
              {partner.address && <p className="flex items-start"><MapPinIcon className="w-5 h-5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" /> {partner.address}</p>}
              {partner.phone && <p className="flex items-center"><PhoneIcon className="w-5 h-5 mr-2 text-gray-400" /> <a href={`tel:${partner.phone}`} className="hover:text-swiss-mint">{partner.phone}</a></p>}
              {partner.email && <p className="flex items-center"><EnvelopeIcon className="w-5 h-5 mr-2 text-gray-400" /> <a href={`mailto:${partner.email}`} className="hover:text-swiss-mint">{partner.email}</a></p>}
              {partner.website && <p className="flex items-center"><GlobeAltIcon className="w-5 h-5 mr-2 text-gray-400" /> <a href={partner.website} target="_blank" rel="noopener noreferrer" className="hover:text-swiss-mint truncate">{partner.website}</a></p>}
            </div>
            {isFoundationUser && partner.type === 'supplier' && partner.directOrderLink && (
                 <Button 
                    variant="secondary" 
                    leftIcon={ArrowTopRightOnSquareIcon} 
                    onClick={() => window.open(partner.directOrderLink, '_blank')}
                    className="w-full mt-4"
                >
                    {t('partnerDetailPage.directOrderButton')}
                </Button>
            )}
          </Card>
          {partner.description && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('partnerDetailPage.aboutTitle', { partnerName: partner.name })}</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{partner.description}</p>
            </Card>
          )}
           <Card className="p-6">
                <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('partnerDetailPage.ratingsReviewsTitle')}</h2>
                <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-5 h-5 ${i < (partner.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
                    {partner.rating && <span className="ml-2 text-sm text-gray-600">{t('partnerDetailPage.ratingText', { rating: partner.rating.toFixed(1)})}</span>}
                </div>
                <p className="text-sm text-gray-500">{t('partnerDetailPage.reviewsPlaceholder')}</p>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
              {partner.type === 'supplier' ? <ShoppingCartIcon className="w-6 h-6 mr-2 text-swiss-mint" /> : <ListBulletIcon className="w-6 h-6 mr-2 text-swiss-mint" />}
              {partner.type === 'supplier' ? t('sidebar.products') : t('sidebar.services')}
            </h2>
            {partner.type === 'supplier' && (
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
              ) : <p className="text-gray-500">{t('partnerDetailPage.noProductsListed')}</p>
            )}

            {partner.type === 'service_provider' && (
              services.length > 0 ? (
                <div className="space-y-4">
                  {services.map(service => (
                     <Card key={service.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 group hover:shadow-md transition-shadow">
                      <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/100/100`} alt={service.title} className="w-full sm:w-24 h-24 object-cover rounded-md flex-shrink-0" />
                      <div className="flex-grow">
                          <h3 className="text-md font-semibold text-swiss-charcoal group-hover:text-swiss-teal">{service.title}</h3>
                          <p className="text-xs text-gray-500">
                            {formatServiceCategory(t, service.category)}
                            {service.deliveryType && <> • {formatServiceDeliveryType(t, service.deliveryType)}</>}
                          </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                         {service.priceInfo && <p className="text-md font-semibold text-swiss-mint mt-1.5">{service.priceInfo}</p>}
                      </div>
                      {isFoundationUser && (
                        <Button variant="secondary" size="sm" leftIcon={PlusCircleIcon} onClick={() => handleOpenServiceRequestModal(service)} className="mt-2 sm:mt-0 sm:ml-auto flex-shrink-0">
                          {t('partnerDetailPage.requestServiceButton')}
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              ) : <p className="text-gray-500">{t('partnerDetailPage.noServicesListed')}</p>
            )}
            
            {isFoundationUser && (partner.type === 'supplier') && (products.length > 0) && (
                 <Card className="mt-6 p-4 bg-gray-50">
                    <h3 className="text-md font-semibold text-swiss-charcoal mb-2">{t('partnerDetailPage.promoCodeTitle')}</h3>
                    <div className="flex gap-2">
                        <input type="text" placeholder={t('partnerDetailPage.promoCodePlaceholder')} className={`${STANDARD_INPUT_FIELD} flex-grow`} />
                        <Button variant="outline" size="md">{t('partnerDetailPage.applyPromoButton')}</Button>
                    </div>
                </Card>
            )}
          </Card>
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
