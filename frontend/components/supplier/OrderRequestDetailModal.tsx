import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Order, OrderRequestStatus } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { MOCK_ORGANIZATIONS } from '../../constants';

interface OrderRequestDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderRequestStatus) => void;
}

const OrderRequestDetailModal: React.FC<OrderRequestDetailModalProps> = ({ order, isOpen, onClose, onUpdateStatus }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  if (!isOpen || !order) return null;

  const daycare = MOCK_ORGANIZATIONS.find(org => org.id === order.foundationOrgId);

  const handleViewProfile = () => {
    navigate(`/partner/${order.foundationOrgId}`);
    onClose();
  };

  const renderActions = () => {
    switch (order.status) {
      case OrderRequestStatus.SUBMITTED:
        return (
          <>
            <Button variant="danger" onClick={() => onUpdateStatus(order.id, OrderRequestStatus.DECLINED)}>{t('dashboard:supplierDashboard.recentOrdersActions.decline')}</Button>
            <Button variant="primary" onClick={() => onUpdateStatus(order.id, OrderRequestStatus.ACCEPTED)}>{t('dashboard:supplierDashboard.recentOrdersActions.accept')}</Button>
          </>
        );
      case OrderRequestStatus.ACCEPTED:
        return <Button variant="secondary" onClick={() => onUpdateStatus(order.id, OrderRequestStatus.PROCESSING)}>{t("dashboard:orderRequestDetailModal.markAsProcessing")}</Button>;
      case OrderRequestStatus.PROCESSING:
        return <Button variant="secondary" onClick={() => onUpdateStatus(order.id, OrderRequestStatus.SHIPPED)}>{t('dashboard:supplierOrdersPage.actions.ship')}</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('dashboard:orderRequestDetailModal.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-md"><span className="block text-xs text-gray-500">{t('dashboard:orderRequestDetailModal.orderId')}</span><span className="font-semibold">{order.id}</span></div>
            <div className="p-3 bg-gray-50 rounded-md"><span className="block text-xs text-gray-500">{t('dashboard:orderRequestDetailModal.date')}</span><span className="font-semibold">{new Date(order.requestDate).toLocaleDateString(i18n.language)}</span></div>
            <div className="p-3 bg-gray-50 rounded-md"><span className="block text-xs text-gray-500">{t('dashboard:orderRequestDetailModal.status')}</span><span className="font-semibold">{t(`common:orderStatus.${order.status.toLowerCase().replace(/\s/g, '')}` as const, order.status)}</span></div>
            <div className="p-3 bg-gray-50 rounded-md"><span className="block text-xs text-gray-500">{t('dashboard:orderRequestDetailModal.total')}</span><span className="font-semibold">CHF {order.totalAmount.toFixed(2)}</span></div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">{t('dashboard:supplierOrdersPage.table.foundation')}</h3>
            <div className="flex items-center p-3 border rounded-md">
              <img src={daycare?.logoUrl} alt={daycare?.name} className="w-12 h-12 rounded-full mr-3"/>
              <div>
                <p className="font-medium">{daycare?.name}</p>
                <p className="text-xs text-gray-500">{daycare?.region}</p>
              </div>
              <Button variant="outline" size="sm" leftIcon={BuildingStorefrontIcon} className="ml-auto" onClick={handleViewProfile}>
                {t('dashboard:orderRequestDetailModal.viewDaycareProfile')}
              </Button>
            </div>
          </div>

          <h3 className="font-semibold mb-2">{t('dashboard:orderRequestDetailModal.lineItems')}</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">{t('dashboard:orderRequestDetailModal.product')}</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600">{t('dashboard:orderRequestDetailModal.quantity')}</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">{t('dashboard:orderRequestDetailModal.price')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map(item => (
                  <tr key={item.productId}>
                    <td className="px-4 py-2 flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.productName} className="w-10 h-10 rounded-md object-cover"/>
                      {item.productName}
                    </td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">CHF {(item.unitPrice * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {order.notes && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">{t('dashboard:orderRequestDetailModal.notes')}</h3>
              <p className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md italic">{order.notes}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <Button type="button" variant="light" onClick={onClose}>{t('common:buttons.close')}</Button>
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

export default OrderRequestDetailModal;