
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { ShoppingCartIcon, PlusCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import Button from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { MOCK_ORDERS, MOCK_PRODUCTS, MOCK_ORGANIZATIONS } from '../../constants';
import { OrderRequestStatus } from '../../types';

const SupplierDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  // Dynamic data based on logged-in supplier
  const myProducts = currentUser?.orgId ? MOCK_PRODUCTS.filter(p => p.supplierId === currentUser.orgId) : [];
  const myOrders = currentUser?.orgId ? MOCK_ORDERS.filter(o => o.supplierId === currentUser.orgId) : [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueThisMonth = myOrders
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
  const fulfillmentRate = myOrders.length > 0 ? ((fulfilledOrders / myOrders.length) * 100).toFixed(0) : '100';


  const salesOverview = {
    totalOrders: myOrders.length.toString(),
    revenueThisMonth: `CHF ${revenueThisMonth.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    topSelling: topSellingProduct,
    fulfillmentRate: `${fulfillmentRate}%`,
  };

  const productManagement = {
    active: myProducts.length.toString(),
    pending: '0', // Mock data, no 'pending' status in Product model
    lowStock: myProducts.filter(p => p.stockStatus === 'Low Stock').map(p => p.title),
  };

  const orderManagement = {
    pending: myOrders.filter(o => o.status === OrderRequestStatus.SUBMITTED).length.toString(),
    toFulfill: myOrders.filter(o => [OrderRequestStatus.ACCEPTED, OrderRequestStatus.PROCESSING].includes(o.status)).map(o => o.id),
  };

  const getFoundationName = (orgId: string) => {
    const org = MOCK_ORGANIZATIONS.find(o => o.id === orgId);
    return org ? org.name : 'Unknown Foundation';
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('supplierDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('supplierDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales Overview Widget */}
        <Card className="p-6 md:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('supplierDashboard.widgets.sales.title')}</h2>
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
              <span className="text-gray-600">{t('supplierDashboard.widgets.sales.topSelling')}</span>
              <span className="font-medium text-sm text-swiss-teal truncate">{salesOverview.topSelling}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.sales.fulfillmentRate')}</span>
              <span className="font-bold text-lg text-swiss-mint">{salesOverview.fulfillmentRate}</span>
            </div>
          </div>
           <Button variant="secondary" size="sm" className="w-full mt-5" onClick={() => navigate('/supplier/analytics')}>{t('supplierDashboard.widgets.sales.button')}</Button>
        </Card>

        {/* Product Management Widget */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('supplierDashboard.widgets.products.title')}</h2>
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
                    <p className="text-sm font-medium text-gray-600 flex items-center"><ExclamationTriangleIcon className="w-4 h-4 mr-1 text-red-500"/>{t('supplierDashboard.widgets.products.lowStock')}</p>
                    <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                        {productManagement.lowStock.map(item => <li key={item} className="truncate">{item}</li>)}
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
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('supplierDashboard.widgets.orders.title')}</h2>
          <div className="space-y-3">
             <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('supplierDashboard.widgets.orders.pending')}</span>
              <span className="font-bold text-lg text-swiss-coral">{orderManagement.pending}</span>
            </div>
            {orderManagement.toFulfill.length > 0 && (
                <div>
                    <p className="text-sm font-medium text-gray-600">{t('supplierDashboard.widgets.orders.toFulfill')}</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                        {orderManagement.toFulfill.map(item => <li key={item}>{item.substring(0,12)}...</li>)}
                    </ul>
                </div>
            )}
          </div>
           <Button variant="outline" size="sm" className="w-full mt-5" onClick={() => navigate('/supplier/orders')}>
                {t('supplierDashboard.widgets.orders.button')}
           </Button>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('supplierDashboard.recentOrdersTitle')}</h2>
        {myOrders.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('supplierDashboard.noRecentOrders')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.id')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.creche')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.date')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.total')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierDashboard.recentOrdersTable.status')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-swiss-teal">{order.id.split('-')[1]}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getFoundationName(order.foundationOrgId)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(order.requestDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">CHF {order.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}>
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
    </div>
  );
};

export default SupplierDashboardPage;
