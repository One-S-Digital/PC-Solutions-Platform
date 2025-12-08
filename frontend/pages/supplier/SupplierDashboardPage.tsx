import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { ShoppingCartIcon, PlusCircleIcon, ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import Button from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { Order, Product, OrderRequestStatus, Organization, Inquiry, InquiryStatus, InquiryStats } from '../../types';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface SupplierStats {
  totalOrders: number;
  pendingOrders: number;
  revenueThisMonth: number;
  fulfillmentRate: number;
}

const SupplierDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [inquiryStats, setInquiryStats] = useState<InquiryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser?.orgId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch data in parallel
      const [productsRes, ordersRes, statsRes, orgsRes, inquiryStatsRes] = await Promise.all([
        authenticatedRequest<Product[]>('/marketplace/products'),
        authenticatedRequest<Order[]>('/marketplace/orders'),
        authenticatedRequest<SupplierStats>('/dashboard/supplier/stats'),
        authenticatedRequest<Organization[]>('/compat/organizations'),
        authenticatedRequest<{ data: InquiryStats }>('/marketplace/inquiries/stats'),
      ]);

      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data);
      }
      if (inquiryStatsRes.success && inquiryStatsRes.data) {
        // Handle both direct data and nested data response
        const inquiryData = (inquiryStatsRes.data as any)?.data || inquiryStatsRes.data;
        setInquiryStats(inquiryData);
      }
    } catch (err) {
      console.error('Failed to fetch supplier dashboard data:', err);
      setError(t('supplierDashboard.loadError', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.orgId, authenticatedRequest, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate derived data
  const myProducts = products;
  const myOrders = orders;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueThisMonth = stats?.revenueThisMonth ?? myOrders
    .filter(order => new Date(order.requestDate) >= startOfMonth)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const topSellingProduct = (() => {
    if (myOrders.length === 0) return t('supplierDashboard.noSalesYet', 'No sales yet');
    const productQuantities = new Map<string, number>();
    myOrders.forEach(order => {
      order.items.forEach(item => {
        productQuantities.set(item.productName, (productQuantities.get(item.productName) || 0) + item.quantity);
      });
    });
    if (productQuantities.size === 0) return t('supplierDashboard.noSalesYet', 'No sales yet');
    return [...productQuantities.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
  })();
  
  const fulfilledOrders = myOrders.filter(o => o.status === OrderRequestStatus.FULFILLED).length;
  const fulfillmentRate = stats?.fulfillmentRate ?? (myOrders.length > 0 ? ((fulfilledOrders / myOrders.length) * 100) : 0);

  const salesOverview = {
    totalOrders: (stats?.totalOrders ?? myOrders.length).toString(),
    revenueThisMonth: `CHF ${revenueThisMonth.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    topSelling: topSellingProduct,
    fulfillmentRate: `${fulfillmentRate.toFixed(0)}%`,
  };

  const productManagement = {
    active: myProducts.length.toString(),
    pending: '0',
    lowStock: myProducts.filter(p => p.stockStatus === 'Low Stock').map(p => p.title),
  };

  const orderManagement = {
    pending: (stats?.pendingOrders ?? myOrders.filter(o => o.status === OrderRequestStatus.SUBMITTED).length).toString(),
    toFulfill: myOrders.filter(o => [OrderRequestStatus.ACCEPTED, OrderRequestStatus.PROCESSING].includes(o.status)).map(o => o.id),
  };

  const getFoundationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : t('common:unknown', 'Unknown Foundation');
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('supplierDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('supplierDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Overview Widget */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-swiss-teal/10 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-swiss-teal" />
            </div>
            <h2 className="text-lg font-semibold text-swiss-charcoal">{t('supplierDashboard.widgets.sales.title')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.sales.totalOrders')}</span>
              <span className="font-bold text-lg text-swiss-charcoal">{salesOverview.totalOrders}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.sales.revenueMonth')}</span>
              <span className="font-bold text-lg text-swiss-charcoal">{salesOverview.revenueThisMonth}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.sales.fulfillmentRate')}</span>
              <span className="font-bold text-lg text-swiss-mint">{salesOverview.fulfillmentRate}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-5" onClick={() => navigate('/supplier/analytics')}>
            {t('supplierDashboard.widgets.sales.button')}
          </Button>
        </Card>

        {/* Inquiries Widget */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-swiss-coral/10 rounded-lg">
              <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-swiss-coral" />
            </div>
            <h2 className="text-lg font-semibold text-swiss-charcoal">{t('supplierDashboard.widgets.inquiries.title', 'Inquiries')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.inquiries.new', 'New')}</span>
              <span className="font-bold text-lg text-swiss-coral">{inquiryStats?.newInquiries ?? 0}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.inquiries.pending', 'Pending')}</span>
              <span className="font-bold text-lg text-amber-600">{inquiryStats?.pendingInquiries ?? 0}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.inquiries.conversionRate', 'Conversion')}</span>
              <span className="font-bold text-lg text-swiss-mint">{inquiryStats?.conversionRate ?? '0%'}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-5" onClick={() => navigate('/supplier/orders?tab=inquiries')}>
            {t('supplierDashboard.widgets.inquiries.button', 'View Inquiries')}
          </Button>
        </Card>

        {/* Product Management Widget */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('supplierDashboard.widgets.products.title')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.products.active')}</span>
              <span className="font-bold text-lg text-swiss-charcoal">{productManagement.active}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.products.pending')}</span>
              <span className="font-bold text-lg text-yellow-600">{productManagement.pending}</span>
            </div>
            {productManagement.lowStock.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-600 flex items-center">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-red-500"/>
                  {t('supplierDashboard.widgets.products.lowStock')}
                </p>
                <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                  {productManagement.lowStock.slice(0, 2).map(item => <li key={item} className="truncate">{item}</li>)}
                </ul>
              </div>
            )}
          </div>
          <Button variant="primary" leftIcon={PlusCircleIcon} size="sm" className="w-full mt-5" onClick={() => navigate('/supplier/product-listings')}>
            {t('supplierDashboard.widgets.products.button')}
          </Button>
        </Card>

        {/* Order Management Widget */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-swiss-sand/30 rounded-lg">
              <ShoppingCartIcon className="w-6 h-6 text-amber-700" />
            </div>
            <h2 className="text-lg font-semibold text-swiss-charcoal">{t('supplierDashboard.widgets.orders.title')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.orders.pending')}</span>
              <span className="font-bold text-lg text-swiss-coral">{orderManagement.pending}</span>
            </div>
            {orderManagement.toFulfill.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600">{t('supplierDashboard.widgets.orders.toFulfill')}</p>
                <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                  {orderManagement.toFulfill.slice(0, 3).map(item => <li key={item}>{item.substring(0,12)}...</li>)}
                </ul>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-5" onClick={() => navigate('/supplier/orders')}>
            {t('supplierDashboard.widgets.orders.button')}
          </Button>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('supplierDashboard.recentOrdersTitle')}</h2>
            <Button variant="link" size="sm" onClick={() => navigate('/supplier/orders')}>
              {t('common:viewAll', 'View All')}
            </Button>
          </div>
          {myOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('supplierDashboard.noRecentOrders')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.creche')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.total')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/supplier/orders?order=${order.id}`)}>
                      <td className="px-3 py-2 whitespace-nowrap">{getFoundationName(order.foundationOrgId)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">CHF {order.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getOrderStatusClass(order.status)}`}>
                          {t(`orderStatus.${order.status.toLowerCase().replace(/\s/g, '')}` as const, order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Inquiries Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('supplierDashboard.recentInquiriesTitle', 'Recent Inquiries')}</h2>
            <Button variant="link" size="sm" onClick={() => navigate('/supplier/orders?tab=inquiries')}>
              {t('common:viewAll', 'View All')}
            </Button>
          </div>
          {!inquiryStats?.recentInquiries?.length ? (
            <p className="text-gray-500 text-center py-4">{t('supplierDashboard.noRecentInquiries', 'No recent inquiries')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentInquiriesTable.from', 'From')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentInquiriesTable.subject', 'Subject')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentInquiriesTable.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiryStats.recentInquiries.slice(0, 5).map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/supplier/orders?tab=inquiries&inquiry=${inquiry.id}`)}>
                      <td className="px-3 py-2 whitespace-nowrap">{inquiry.buyerName}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{inquiry.subject || (inquiry.message?.substring(0, 30) ?? '')}...</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getInquiryStatusClass(inquiry.status)}`}>
                          {t(`inquiryStatus.${inquiry.status.toLowerCase()}` as const, inquiry.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SupplierDashboardPage;
