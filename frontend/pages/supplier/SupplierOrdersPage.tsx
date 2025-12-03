import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { MOCK_ORDERS, MOCK_ORGANIZATIONS } from '../../constants';
import { Order, OrderRequestStatus } from '../../types';
import Button from '../../components/ui/Button';
import OrderRequestDetailModal from '../../components/supplier/OrderRequestDetailModal';

const SupplierOrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [statusFilter, setStatusFilter] = useState<OrderRequestStatus | 'All'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const myOrders = useMemo(() => {
    return orders.filter(o => o.supplierId === currentUser?.orgId);
  }, [orders, currentUser?.orgId]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return myOrders;
    return myOrders.filter(o => o.status === statusFilter);
  }, [myOrders, statusFilter]);
  
  const orderStatuses: (OrderRequestStatus | 'All')[] = ['All', ...Object.values(OrderRequestStatus)];

  const getFoundationName = (orgId: string) => {
    const org = MOCK_ORGANIZATIONS.find(o => o.id === orgId);
    return org ? org.name : t('dashboard:foundationOrdersAppointmentsPage.unknownProvider');
  };

  const getStatusClass = (status: OrderRequestStatus) => {
    switch (status) {
      case OrderRequestStatus.SUBMITTED: return 'bg-swiss-coral/20 text-swiss-coral';
      case OrderRequestStatus.ACCEPTED:
      case OrderRequestStatus.PROCESSING:
        return 'bg-swiss-sand/30 text-amber-700';
      case OrderRequestStatus.SHIPPED: return 'bg-swiss-teal/20 text-swiss-teal';
      case OrderRequestStatus.FULFILLED: return 'bg-swiss-mint text-white';
      case OrderRequestStatus.CANCELLED:
      case OrderRequestStatus.DECLINED:
        return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const handleUpdateStatus = (orderId: string, newStatus: OrderRequestStatus) => {
    setOrders(prevOrders => prevOrders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    setSelectedOrder(prevOrder => prevOrder ? { ...prevOrder, status: newStatus } : null);
    alert(`Order ${orderId} has been updated to ${newStatus}.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal">{t('dashboard:supplierOrdersPage.title')}</h1>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">{t('dashboard:supplierOrdersPage.filterByStatus')}:</span>
            {orderStatuses.map(status => (
                <Button 
                    key={status} 
                    variant={statusFilter === status ? 'secondary' : 'light'} 
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                >
                    {status === 'All' ? t('common:filters.all') : t(`common:orderStatus.${status.toLowerCase().replace(/\s/g, '')}` as const, status)}
                </Button>
            ))}
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:supplierOrdersPage.table.orderId')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:supplierOrdersPage.table.foundation')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:supplierOrdersPage.table.date')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:supplierOrdersPage.table.total')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard:supplierOrdersPage.table.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-teal">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getFoundationName(order.foundationOrgId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.requestDate).toLocaleDateString(i18n.language)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">CHF {order.totalAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                      {t(`common:orderStatus.${order.status.toLowerCase().replace(/\s/g, '')}` as const, order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && <p className="text-center text-gray-500 py-8">{t('dashboard:supplierOrdersPage.emptyState')}</p>}
        </div>
      </Card>
      <OrderRequestDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default SupplierOrdersPage;