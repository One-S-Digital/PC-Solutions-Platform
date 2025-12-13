import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { Order, OrderRequestStatus, Organization, Inquiry, InquiryStatus } from '../../types';
import Button from '../../components/ui/Button';
import OrderRequestDetailModal from '../../components/supplier/OrderRequestDetailModal';
import InquiryDetailModal from '../../components/supplier/InquiryDetailModal';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type TabType = 'orders' | 'inquiries';

const SupplierOrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderRequestStatus | 'All'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Inquiries state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<InquiryStatus | 'All'>('All');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [ordersRes, orgsRes, inquiriesRes] = await Promise.all([
        authenticatedRequest<Order[]>('/marketplace/orders'),
        authenticatedRequest<Organization[]>('/compat/organizations'),
        authenticatedRequest<{ data: Inquiry[] }>('/marketplace/inquiries/received'),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      } else if (!ordersRes.success) {
        console.error('Orders API returned failure:', ordersRes);
      }
      
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data);
      }

      if (inquiriesRes.success && inquiriesRes.data) {
        // Handle both direct array and nested data response
        const inquiryData = Array.isArray(inquiriesRes.data) 
          ? inquiriesRes.data 
          : (inquiriesRes.data as any).data || [];
        setInquiries(inquiryData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(t('supplierOrdersPage.loadError', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.orgId, authenticatedRequest, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter orders for this supplier
  const myOrders = useMemo(() => {
    return orders.filter(o => o.supplierId === currentUser?.orgId);
  }, [orders, currentUser?.orgId]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'All') return myOrders;
    return myOrders.filter(o => o.status === orderStatusFilter);
  }, [myOrders, orderStatusFilter]);

  const filteredInquiries = useMemo(() => {
    if (inquiryStatusFilter === 'All') return inquiries;
    return inquiries.filter(i => i.status === inquiryStatusFilter);
  }, [inquiries, inquiryStatusFilter]);
  
  const orderStatuses: (OrderRequestStatus | 'All')[] = ['All', ...Object.values(OrderRequestStatus)];
  const inquiryStatuses: (InquiryStatus | 'All')[] = ['All', ...Object.values(InquiryStatus)];

  const getFoundationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : t('foundationOrdersAppointmentsPage.unknownProvider');
  };

  const getOrderStatusClass = (status: OrderRequestStatus) => {
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

  const getInquiryStatusClass = (status: InquiryStatus) => {
    switch (status) {
      case InquiryStatus.NEW: return 'bg-blue-100 text-blue-700';
      case InquiryStatus.PENDING: return 'bg-swiss-coral/20 text-swiss-coral';
      case InquiryStatus.CONTACTED: return 'bg-swiss-sand/30 text-amber-700';
      case InquiryStatus.QUOTED: return 'bg-purple-100 text-purple-700';
      case InquiryStatus.FULFILLED: return 'bg-swiss-mint text-white';
      case InquiryStatus.DECLINED:
      case InquiryStatus.CANCELLED:
        return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderRequestStatus) => {
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

  const handleUpdateInquiryStatus = async (inquiryId: string, newStatus: InquiryStatus, responseMessage?: string, quotedAmount?: number) => {
    try {
      const response = await authenticatedRequest<{ data: Inquiry }>(`/marketplace/inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: newStatus,
          responseMessage,
          quotedAmount,
        }),
      });

      if (response.success) {
        const updatedInquiry = (response.data as any)?.data || response.data;
        setInquiries(prevInquiries => prevInquiries.map(inquiry => 
          inquiry.id === inquiryId ? { ...inquiry, status: newStatus, responseMessage, quotedAmount } : inquiry
        ));
        setSelectedInquiry(prev => prev ? { ...prev, status: newStatus, responseMessage, quotedAmount } : null);
      }
    } catch (err) {
      console.error('Failed to update inquiry status:', err);
      alert(t('supplierOrdersPage.updateError', 'Failed to update inquiry status'));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('supplierOrdersPage.title', 'Orders & Inquiries')}</h1>
        
        {/* Tab Selector */}
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-white text-swiss-teal shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('supplierOrdersPage.tabs.orders', 'Direct Orders')}
            {myOrders.length > 0 && (
              <span className="ml-2 bg-swiss-teal/10 text-swiss-teal px-2 py-0.5 rounded-full text-xs">
                {myOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'inquiries'
                ? 'bg-white text-swiss-teal shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('supplierOrdersPage.tabs.inquiries', 'Inquiries')}
            {inquiries.length > 0 && (
              <span className="ml-2 bg-swiss-coral/10 text-swiss-coral px-2 py-0.5 rounded-full text-xs">
                {inquiries.filter(i => i.status === InquiryStatus.NEW).length > 0 
                  ? inquiries.filter(i => i.status === InquiryStatus.NEW).length 
                  : inquiries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium mr-2">{t('supplierOrdersPage.filterByStatus')}:</span>
              {orderStatuses.map(status => (
                <Button 
                  key={status} 
                  variant={orderStatusFilter === status ? 'secondary' : 'light'} 
                  size="sm"
                  onClick={() => setOrderStatusFilter(status)}
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
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-teal">{order.id.substring(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getFoundationName(order.foundationOrgId)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.requestDate).toLocaleDateString(i18n.language)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">CHF {order.totalAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusClass(order.status)}`}>
                          {t(`orderStatus.${order.status.toLowerCase().replace(/\s/g, '')}` as const, order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <p className="text-center text-gray-500 py-8">{t('supplierOrdersPage.emptyState', 'No orders found')}</p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Inquiries Tab Content */}
      {activeTab === 'inquiries' && (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium mr-2">{t('supplierOrdersPage.filterByStatus')}:</span>
              {inquiryStatuses.map(status => (
                <Button 
                  key={status} 
                  variant={inquiryStatusFilter === status ? 'secondary' : 'light'} 
                  size="sm"
                  onClick={() => setInquiryStatusFilter(status)}
                >
                  {status === 'All' ? t('common:filters.all') : t(`inquiryStatus.${status.toLowerCase()}` as const, status)}
                </Button>
              ))}
            </div>
          </Card>
          
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.inquiryTable.id', 'ID')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.inquiryTable.from', 'From')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.inquiryTable.subject', 'Subject')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.inquiryTable.date', 'Date')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.inquiryTable.urgency', 'Urgency')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierOrdersPage.inquiryTable.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedInquiry(inquiry)}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-teal">{inquiry.id.substring(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inquiry.buyerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{inquiry.subject || inquiry.message}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inquiry.createdAt).toLocaleDateString(i18n.language)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inquiry.urgency && (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            inquiry.urgency === 'URGENT' ? 'bg-red-100 text-red-700' :
                            inquiry.urgency === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            inquiry.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {inquiry.urgency}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInquiryStatusClass(inquiry.status)}`}>
                          {t(`inquiryStatus.${inquiry.status.toLowerCase()}` as const, inquiry.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInquiries.length === 0 && (
                <p className="text-center text-gray-500 py-8">{t('supplierOrdersPage.noInquiries', 'No inquiries found')}</p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Order Detail Modal */}
      <OrderRequestDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdateStatus={handleUpdateOrderStatus}
        organizations={organizations}
      />

      {/* Inquiry Detail Modal */}
      <InquiryDetailModal
        isOpen={!!selectedInquiry}
        onClose={() => setSelectedInquiry(null)}
        inquiry={selectedInquiry}
        onUpdateStatus={handleUpdateInquiryStatus}
      />
    </div>
  );
};

export default SupplierOrdersPage;
