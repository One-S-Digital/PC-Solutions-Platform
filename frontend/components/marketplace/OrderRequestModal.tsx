
import React, { useState } from 'react';
import { Product, OrderRequest } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card'; // Re-using Card for modal structure
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { STANDARD_INPUT_FIELD } from '../../constants'; // Import constant
import { useTranslation } from 'react-i18next';

interface OrderRequestModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitOrder: (order: Omit<OrderRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId' | 'supplierId'>) => void;
}

const OrderRequestModal: React.FC<OrderRequestModalProps> = ({ product, isOpen, onClose, onSubmitOrder }) => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 1) {
        alert("Quantity must be at least 1."); // Consider translating this alert
        return;
    }
    onSubmitOrder({
      productId: product.id,
      productName: product.title,
      // supplierId would be product.supplierId but needs to be orgId of supplier
      quantity,
      notes,
    });
    setQuantity(1);
    setNotes('');
    // onClose(); // Caller can decide to close or show success message in modal
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" role="dialog" aria-modal="true" aria-labelledby="orderRequestModalTitle">
      <Card className="w-full max-w-lg bg-white p-0 shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="orderRequestModalTitle" className="text-xl font-semibold text-swiss-charcoal">{t('orderRequestModal.title', { productTitle: product.title })}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label={t('buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">{t('orderRequestModal.labels.product')}</label>
              <input
                type="text"
                id="productName"
                value={product.title}
                readOnly
                className={`${STANDARD_INPUT_FIELD} bg-gray-100 cursor-not-allowed`}
              />
            </div>
            <div>
              <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700 mb-1">{t('orderRequestModal.labels.supplier')}</label>
              <input
                type="text"
                id="supplierName"
                value={product.supplierName}
                readOnly
                className={`${STANDARD_INPUT_FIELD} bg-gray-100 cursor-not-allowed`}
              />
            </div>
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">{t('orderRequestModal.labels.quantity')}</label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                min="1"
                required
                className={`${STANDARD_INPUT_FIELD} w-1/3`}
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">{t('orderRequestModal.labels.notes')}</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('orderRequestModal.placeholders.notes')}
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Button type="button" variant="light" onClick={onClose}>{t('buttons.cancel')}</Button>
            <Button type="submit" variant="primary">{t('buttons.submitRequest')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default OrderRequestModal;
