import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import { 
  ShoppingCartIcon, 
  CalendarDaysIcon, 
  InboxIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import {
  foundationOrdersApi,
  getOrderStatusClass,
  getServiceStatusClass,
  Order,
  OrderItem,
  ServiceAppointment,
} from '../../services/foundationOrdersService';

const FoundationOrdersAppointmentsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { request } = useAuthenticatedApi();
  
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders and service requests
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [ordersRes, servicesRes] = await Promise.all([
        request<Order[]>(foundationOrdersApi.getOrdersEndpoint()),
        request<ServiceAppointment[]>(foundationOrdersApi.getServiceRequestsEndpoint()),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (servicesRes.success && servicesRes.data) {
        setServiceRequests(servicesRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t('common:errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMessageSupplier = (supplierId: string) => {
    // Navigate to messages page - in production, would create/get conversation with supplier
    navigate('/messages');
  };

  const handleMessageProvider = (providerId: string) => {
    navigate('/messages');
  };

  const ProductOrdersView = () => (
    <Card className="p-4 mt-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-swiss-charcoal">
          {t('foundationOrdersAppointmentsPage.productOrdersTitle')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => alert(t('foundationOrdersAppointmentsPage.exportCsvProductAlert'))}>
          {t('foundationOrdersAppointmentsPage.exportCsvButton')}
        </Button>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          {t('foundationOrdersAppointmentsPage.noProductOrders')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.refNo')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.supplier')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.itemsQty')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.total')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.date')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.status')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map(order => {
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-swiss-teal">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {order.supplierLogoUrl && (
                          <img 
                            src={order.supplierLogoUrl} 
                            alt={order.supplierName} 
                            className="w-6 h-6 rounded-full mr-2"
                          />
                        )}
                        {order.supplierName || t('foundationOrdersAppointmentsPage.unknownSupplier')}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {order.items.map((item, idx) => (
                        <span key={idx}>
                          {item.productName} ({item.quantity})
                          {idx < order.items.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      CHF {order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString(i18n.language)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getOrderStatusClass(order.status)}`}>
                        {t(`orderStatus.${order.status.toLowerCase()}` as any, order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => handleMessageSupplier(order.supplierId)}
                      >
                        {t('common:buttons.sendMessage')}
                      </Button>
                      {order.status === 'PENDING' && (
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          className="text-red-600 hover:text-red-700 ml-1" 
                          onClick={() => alert(t('foundationOrdersAppointmentsPage.cancelOrderAlert', { orderId: order.id }))}
                        >
                          {t('common:buttons.cancel')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const ServiceAppointmentsView = () => (
    <Card className="p-4 mt-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-swiss-charcoal">
          {t('foundationOrdersAppointmentsPage.serviceAppointmentsTitle')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => alert(t('foundationOrdersAppointmentsPage.exportCsvServiceAlert'))}>
          {t('foundationOrdersAppointmentsPage.exportCsvButton')}
        </Button>
      </div>
      {serviceRequests.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          {t('foundationOrdersAppointmentsPage.noServiceAppointments')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.refNo')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.provider')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.service')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.date')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.status')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('foundationOrdersAppointmentsPage.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceRequests.map(req => {
                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-swiss-teal">
                      {req.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {req.providerLogoUrl && (
                          <img 
                            src={req.providerLogoUrl} 
                            alt={req.providerName} 
                            className="w-6 h-6 rounded-full mr-2"
                          />
                        )}
                        {req.providerName || t('foundationOrdersAppointmentsPage.unknownProvider')}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {req.serviceTitle || t('foundationOrdersAppointmentsPage.unknownService')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {req.scheduledAt 
                        ? new Date(req.scheduledAt).toLocaleDateString(i18n.language)
                        : new Date(req.requestedAt).toLocaleDateString(i18n.language) + ` (${t('foundationOrdersAppointmentsPage.requestedAbbr')})`
                      }
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getServiceStatusClass(req.status)}`}>
                        {t(`serviceStatus.${req.status.toLowerCase()}` as any, req.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => handleMessageProvider(req.providerId)}
                      >
                        {t('common:buttons.sendMessage')}
                      </Button>
                      {['PENDING', 'CONFIRMED', 'SCHEDULED'].includes(req.status) && (
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          className="text-orange-600 hover:text-orange-700 ml-1" 
                          onClick={() => alert(t('foundationOrdersAppointmentsPage.rescheduleAlert', { requestId: req.id }))}
                        >
                          {t('foundationOrdersAppointmentsPage.rescheduleButton')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const tabs = [
    { 
      label: t('foundationOrdersAppointmentsPage.productOrdersTab'), 
      icon: ShoppingCartIcon, 
      content: <ProductOrdersView /> 
    },
    { 
      label: t('foundationOrdersAppointmentsPage.serviceAppointmentsTab'), 
      icon: CalendarDaysIcon, 
      content: <ServiceAppointmentsView /> 
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('sidebar.ordersAppointments')}</h1>
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('sidebar.ordersAppointments')}</h1>
        <Card className="p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData}>{t('common:buttons.retry')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal">{t('sidebar.ordersAppointments')}</h1>
      <Tabs
        tabs={tabs}
        variant="pills"
        activeTab={activeTabIndex}
        onTabChange={setActiveTabIndex}
      />
    </div>
  );
};

export default FoundationOrdersAppointmentsPage;
