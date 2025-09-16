import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { marketplaceService, Product, Service, MarketplaceFilters } from '../services/marketplaceService';
import { SwissCard, SwissButton, Input, Badge } from '@repo/ui';
import { ProductCard } from '../components/marketplace/ProductCard';
import { ServiceCard } from '../components/marketplace/ServiceCard';
import { MarketplaceFilters as FiltersComponent } from '../components/marketplace/MarketplaceFilters';
import { CartModal } from '../components/marketplace/CartModal';
import { useTranslation } from 'react-i18next';

export default function MarketplacePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const productsData = await marketplaceService.getProducts(filters);
        setProducts(productsData);
      } else {
        const servicesData = await marketplaceService.getServices(filters);
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { productId, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const handleCheckout = async () => {
    try {
      await marketplaceService.createOrder({
        items: cart,
        notes: 'Order from marketplace',
      }, getToken);
      setCart([]);
      setShowCart(false);
      // Show success message
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-default mb-2">
            {t('marketplace.title', 'Marketplace')}
          </h1>
          <p className="text-text-secondary">
            {t('marketplace.subtitle', 'Discover products and services for your childcare facility')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <SwissButton
            variant={activeTab === 'products' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('products')}
          >
            {t('marketplace.products', 'Products')}
            <Badge variant="info" className="ml-2">
              {products.length}
            </Badge>
          </SwissButton>
          <SwissButton
            variant={activeTab === 'services' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('services')}
          >
            {t('marketplace.services', 'Services')}
            <Badge variant="info" className="ml-2">
              {services.length}
            </Badge>
          </SwissButton>
        </div>

        {/* Filters and Cart */}
        <div className="flex justify-between items-center mb-6">
          <FiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            type={activeTab}
          />
          
          {activeTab === 'products' && cartItemCount > 0 && (
            <SwissButton
              variant="primary"
              onClick={() => setShowCart(true)}
              className="relative"
            >
              {t('marketplace.cart', 'Cart')}
              <Badge variant="error" className="ml-2">
                {cartItemCount}
              </Badge>
            </SwissButton>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <SwissCard key={i} className="animate-pulse">
                <div className="h-48 bg-surface-2 rounded-lg mb-4"></div>
                <div className="h-4 bg-surface-2 rounded mb-2"></div>
                <div className="h-3 bg-surface-2 rounded mb-4"></div>
                <div className="h-8 bg-surface-2 rounded"></div>
              </SwissCard>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeTab === 'products' ? (
              products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))
            ) : (
              services.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                />
              ))
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && (
          activeTab === 'products' ? products.length === 0 : services.length === 0
        ) && (
          <SwissCard className="text-center py-12">
            <div className="text-text-secondary mb-4">
              {t('marketplace.noItems', 'No items found matching your criteria')}
            </div>
            <SwissButton
              variant="outline"
              onClick={() => setFilters({})}
            >
              {t('marketplace.clearFilters', 'Clear Filters')}
            </SwissButton>
          </SwissCard>
        )}
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        products={products}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}