import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { Order, OrderRequestStatus, Organization } from '../../types';
import Button from '../../components/ui/Button';
import OrderRequestDetailModal from '../../components/supplier/OrderRequestDetailModal';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SupplierOrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderRequestStatus | 'All'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser?.orgId) return;

    setLoading(true);
    setError(null);

    try {
      const [ordersRes, orgsRes] = await Promise.all([
        authenticatedRequest<Order[]>('/marketplace/orders'),
        authenticatedRequest<Organization[]>('/compat/organizations'),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(t('supplierOrdersPage.loadError', 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.orgId, authenticatedRequest, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const myOrders = useMemo(() => {
    return orders.filter(o => o.supplierId === currentUser?.orgId);
  }, [orders, currentUser?.orgId]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return myOrders;
    return myOrders.filter(o => o.status === statusFilter);
  }, [myOrders, statusFilter]);
  
  const orderStatuses: (OrderRequestStatus | 'All')[] = ['All', ...Object.values(OrderRequestStatus)];

  const getFoundationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : t('foundationOrdersAppointmentsPage.unknownProvider');
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
  
  const handleUpdateStatus = async (orderId: string, newStatus: OrderRequestStatus) => {
    try {
      const response = await authenticatedRequest<Order>(`/marketplace/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.success) {
        setOrders(prevOrders => prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        setSelectedOrder(prevOrder => prevOrder ? { ...prevOrder, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert(t('supplierOrdersPage.updateError', 'Failed to update order status'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData}>{t('common:retry', 'Retry')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal">{t('supplierOrdersPage.title')}</h1>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">{t('supplierOrdersPage.filterByStatus')}:</span>
            {orderStatuses.map(status => (
                <Button 
                    key={status} 
                    variant={statusFilter === status ? 'secondary' : 'light'} 
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                >
                    {status === 'All' ? t('common:filters.all') : t(`orderStatus.${status.toLowerCase().replace(/\s/g, '')}` as const, status)}
                </Button>
            ))}
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.table.orderId')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.table.foundation')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.table.date')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.table.total')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.table.status')}</th>
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
                      {t(`orderStatus.${order.status.toLowerCase().replace(/\s/g, '')}` as const, order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && <p className="text-center text-gray-500 py-8">{t('supplierOrdersPage.emptyState')}</p>}
        </div>
      </Card>
      <OrderRequestDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdateStatus={handleUpdateStatus}
        organizations={organizations}
      />
    </div>
  );
};

export default SupplierOrdersPage;
