import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { marketplaceService, Product, Service, MarketplaceFilters } from '../services/marketplaceService';
import { Card, Button, Input, Badge } from '@repo/ui';
import { ProductCard } from '../components/marketplace/ProductCard';
import { ServiceCard } from '../components/marketplace/ServiceCard';
import { MarketplaceFilters as FiltersComponent } from '../components/marketplace/MarketplaceFilters';
import { CartModal } from '../components/marketplace/CartModal';
import { useTranslation } from 'react-i18next';

export default function MarketplacePage() {
  const { user } = useUser();
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
      });
      setCart([]);
      setShowCart(false);
      // Show success message
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen frontend-page">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Swiss Modern Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="h-1 w-16 bg-swiss-mint rounded-full mr-4"></div>
            <h1 className="text-3xl font-bold text-swiss-charcoal">
              {t('marketplace.title', 'Marketplace')}
            </h1>
          </div>
          <p className="text-swiss-gray font-medium">
            {t('marketplace.subtitle', 'Discover products and services for your childcare facility')}
          </p>
        </div>

        {/* Swiss Modern Tabs */}
        <div className="flex space-x-2 mb-8">
          <Button
            variant={activeTab === 'products' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('products')}
            className="flex items-center"
          >
            {t('marketplace.products', 'Products')}
            <Badge variant="mint" className="ml-2">
              {products.length}
            </Badge>
          </Button>
          <Button
            variant={activeTab === 'services' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('services')}
            className="flex items-center"
          >
            {t('marketplace.services', 'Services')}
            <Badge variant="teal" className="ml-2">
              {services.length}
            </Badge>
          </Button>
        </div>

        {/* Filters and Cart */}
        <div className="flex justify-between items-center mb-8">
          <FiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            type={activeTab}
          />
          
          {activeTab === 'products' && cartItemCount > 0 && (
            <Button
              variant="primary"
              onClick={() => setShowCart(true)}
              className="relative"
            >
              {t('marketplace.cart', 'Cart')}
              <Badge variant="coral" className="ml-2">
                {cartItemCount}
              </Badge>
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-swiss-light rounded-card mb-4"></div>
                <div className="h-4 bg-swiss-light rounded mb-2"></div>
                <div className="h-3 bg-swiss-light rounded mb-4"></div>
                <div className="h-8 bg-swiss-light rounded"></div>
              </Card>
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
          <Card className="text-center py-12">
            <div className="text-swiss-gray mb-4">
              {t('marketplace.noItems', 'No items found matching your criteria')}
            </div>
            <Button
              variant="outline"
              onClick={() => setFilters({})}
            >
              {t('marketplace.clearFilters', 'Clear Filters')}
            </Button>
          </Card>
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