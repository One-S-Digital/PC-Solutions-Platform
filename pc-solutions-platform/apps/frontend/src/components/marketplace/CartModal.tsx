import React from 'react';
import { SwissCard, SwissButton, Input, Badge } from '@repo/ui';
import { Product } from '../../services/marketplaceService';
import { useTranslation } from 'react-i18next';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { productId: string; quantity: number }[];
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCheckout: () => void;
}

export function CartModal({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQuantity,
  onRemoveFromCart,
  onCheckout,
}: CartModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const cartProducts = cart.map(cartItem => {
    const product = products.find(p => p.id === cartItem.productId);
    return product ? { ...product, quantity: cartItem.quantity } : null;
  }).filter(Boolean) as (Product & { quantity: number })[];

  const totalAmount = cartProducts.reduce((total, item) => {
    return total + (item.price || 0) * item.quantity;
  }, 0);

  const formatPrice = (price?: number) => {
    if (!price) return t('marketplace.priceOnRequest', 'Price on request');
    return `CHF ${price.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <SwissCard className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-default">
            {t('marketplace.shoppingCart', 'Shopping Cart')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-default transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="p-6 overflow-y-auto max-h-96">
          {cartProducts.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {t('marketplace.cartEmpty', 'Your cart is empty')}
            </div>
          ) : (
            <div className="space-y-4">
              {cartProducts.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-surface-2 rounded-lg">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-surface-1 rounded-lg overflow-hidden flex-shrink-0">
                    {item.imageAsset ? (
                      <img
                        src={item.imageAsset.publicUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-default truncate">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {formatPrice(item.price)}
                    </p>
                    {item.supplier && (
                      <p className="text-xs text-text-secondary">
                        {t('marketplace.supplier', 'Supplier')}: {item.supplier.name}
                      </p>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <SwissButton
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </SwissButton>
                    <span className="w-8 text-center text-text-default">
                      {item.quantity}
                    </span>
                    <SwissButton
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </SwissButton>
                  </div>

                  {/* Remove Button */}
                  <SwissButton
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveFromCart(item.id)}
                    className="text-danger hover:text-danger"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </SwissButton>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartProducts.length > 0 && (
          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-text-default">
                {t('marketplace.total', 'Total')}:
              </span>
              <span className="text-lg font-bold text-text-default">
                CHF {totalAmount.toFixed(2)}
              </span>
            </div>
            
            <div className="flex gap-3">
              <SwissButton
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                {t('marketplace.continueShopping', 'Continue Shopping')}
              </SwissButton>
              <SwissButton
                variant="primary"
                onClick={onCheckout}
                className="flex-1"
              >
                {t('marketplace.proceedToCheckout', 'Proceed to Checkout')}
              </SwissButton>
            </div>
          </div>
        )}
      </SwissCard>
    </div>
  );
}