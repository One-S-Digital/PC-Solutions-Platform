import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAppContext } from '../../contexts/AppContext';
import Button from '../ui/Button';
import { XMarkIcon, ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import { OrderRequestStatus, LineItem, Order } from '../../types';
import QuantityInput from '../ui/QuantityInput';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface OrderSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderSummaryDrawer: React.FC<OrderSummaryDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { authenticatedRequest } = useAuthenticatedApi();
  const { 
    cartItems, 
    cartSupplierInfo,
    updateItemQuantity, 
    removeFromCart, 
    clearCart, 
    getCartTotal, 
  } = useCart();
  const { currentUser } = useAppContext();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitOrder = async () => {
    if (!currentUser || !cartSupplierInfo || cartItems.length === 0) {
      alert(
        t(
          'common:order.cannotSubmitMissingInfo',
          'Cannot submit order. User not logged in, supplier info missing, or cart is empty.',
        ),
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const lineItems: LineItem[] = cartItems.map(item => ({
      productId: item.productId,
      productName: item.title,
      quantity: item.quantity,
      unitPrice: item.price,
      imageUrl: item.imageUrl,
    }));

    const orderData = {
      foundationId: currentUser.id,
      foundationOrgId: currentUser.orgId || 'UNKNOWN_ORG',
      supplierId: cartSupplierInfo.id,
      supplierName: cartSupplierInfo.name,
      items: lineItems,
      totalAmount: getCartTotal(),
      notes: notes || undefined,
      status: OrderRequestStatus.SUBMITTED,
    };

    try {
      const response = await authenticatedRequest<Order>('/marketplace/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      if (response.success && response.data) {
        clearCart();
        setNotes('');
        onClose();
        alert(t('orderSummaryDrawer.orderSuccess', 
          `Order successfully submitted to ${cartSupplierInfo.name}! Order ID: ${response.data.id}`));
      } else {
        throw new Error(response.message || 'Failed to submit order');
      }
    } catch (err) {
      console.error('Failed to submit order:', err);
      setError(t('orderSummaryDrawer.orderError', 'Failed to submit order. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gray-600 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
              <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center" id="slide-over-title">
                    <ShoppingCartIcon className="h-6 w-6 mr-2 text-swiss-mint" />
                    {t("orderSummaryDrawer.title")}
                  </h2>
                  <div className="ml-3 h-7 flex items-center">
                    <button
                      type="button"
                      className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <span className="sr-only">{t("orderSummaryDrawer.closePanel")}</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {cartItems.length === 0 ? (
                  <div className="text-center py-10">
                    <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">{t("orderSummaryDrawer.emptyCart")}</p>
                    {cartSupplierInfo && <p className="text-xs text-gray-400 mt-1">Items will be from {cartSupplierInfo.name}.</p>}
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 mb-2">{t("orderSummaryDrawer.itemsFrom")}: <span className="font-medium text-swiss-teal">{cartSupplierInfo?.name || 'Supplier'}</span></p>
                    <ul role="list" className="-my-6 divide-y divide-gray-200">
                      {cartItems.map((item) => (
                        <li key={item.productId} className="py-6 flex">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                            <img
                              src={item.imageUrl || `https://picsum.photos/seed/${item.productId}/100/100`}
                              alt={item.title}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>

                          <div className="ml-4 flex-1 flex flex-col">
                            <div>
                              <div className="flex justify-between text-base font-medium text-gray-900">
                                <h3>{item.title}</h3>
                                <p className="ml-4">CHF {(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">Unit Price: CHF {item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex-1 flex items-end justify-between text-sm mt-2">
                              <QuantityInput
                                quantity={item.quantity}
                                onQuantityChange={(newQuantity) => updateItemQuantity(item.productId, newQuantity)}
                                min={0}
                                stockStatus={item.stockStatus}
                              />
                              <div className="flex">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.productId)}
                                  className="font-medium text-swiss-coral hover:text-opacity-80 flex items-center"
                                >
                                  <TrashIcon className="h-4 w-4 mr-1" /> {t('common:buttons.remove', 'Remove')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                  <div>
                    <label htmlFor="orderNotes" className="block text-sm font-medium text-gray-700 mb-1">
                      {t("orderSummaryDrawer.specialInstructions")}
                    </label>
                    <textarea
                      id="orderNotes"
                      name="orderNotes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="shadow-sm focus:ring-swiss-mint focus:border-swiss-mint block w-full sm:text-sm border-gray-300 rounded-md p-2"
                      placeholder={t('orderSummaryDrawer.notesPlaceholder', 'e.g., Preferred delivery times, specific packaging...')}
                    ></textarea>
                  </div>
                  <div className="flex justify-between text-base font-medium text-gray-900 mt-6">
                    <p>{t("orderSummaryDrawer.subtotal")}</p>
                    <p>CHF {getCartTotal().toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{t("orderSummaryDrawer.shippingNote")}</p>
                  <div className="mt-6">
                    <Button
                      variant="danger"
                      size="lg"
                      className="w-full"
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting || cartItems.length === 0}
                    >
                      {isSubmitting 
                        ? t('orderSummaryDrawer.submitting', 'Submitting...') 
                        : `${t('orderSummaryDrawer.submitTo', 'Submit Order to')} ${cartSupplierInfo?.name || 'Supplier'}`}
                    </Button>
                  </div>
                  <div className="mt-4 flex justify-center text-sm text-center text-gray-500">
                    <p>
                      {t('common:or', 'or')}{' '}
                      <button
                        type="button"
                        className="font-medium text-swiss-mint hover:text-opacity-80"
                        onClick={onClose}
                      >
                        {t("orderSummaryDrawer.continueShopping")} <span aria-hidden="true"> &rarr;</span>
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryDrawer;
