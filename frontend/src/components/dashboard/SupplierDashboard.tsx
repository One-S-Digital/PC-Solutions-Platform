import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  TruckIcon, 
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';

export function SupplierDashboard() {
  const { user } = useUser();
  const { t } = useTranslation();

  const stats = [
    { 
      name: t('dashboard.total_orders'), 
      value: '127', 
      change: '+8',
      icon: ClipboardDocumentListIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    },
    { 
      name: t('dashboard.total_sales'), 
      value: 'CHF 45,230', 
      change: '+12%',
      icon: CurrencyDollarIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    },
    { 
      name: t('dashboard.active_products'), 
      value: '23', 
      icon: TruckIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    },
    { 
      name: t('dashboard.pending_orders'), 
      value: '5', 
      icon: ClipboardDocumentListIcon, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100' 
    },
  ];

  const recentOrders = [
    {
      id: 1,
      customer: 'Kinderhaus Zürich',
      product: 'Educational Toys Set',
      amount: 'CHF 450',
      status: 'Shipped',
      time: '2h ago'
    },
    {
      id: 2,
      customer: 'Tagesstätte Bern',
      product: 'Safety Equipment',
      amount: 'CHF 320',
      status: 'Processing',
      time: '4h ago'
    },
    {
      id: 3,
      customer: 'Kita Basel',
      product: 'Art Supplies',
      amount: 'CHF 180',
      status: 'Delivered',
      time: '1d ago'
    },
    {
      id: 4,
      customer: 'Crèche Genève',
      product: 'Outdoor Equipment',
      amount: 'CHF 650',
      status: 'Pending',
      time: '2d ago'
    }
  ];

  const topProducts = [
    { name: 'Educational Toys', sales: 'CHF 12,450', orders: 45 },
    { name: 'Safety Equipment', sales: 'CHF 8,920', orders: 32 },
    { name: 'Art Supplies', sales: 'CHF 6,780', orders: 28 },
    { name: 'Outdoor Equipment', sales: 'CHF 5,340', orders: 18 }
  ];

  const quickActions = [
    { 
      label: t('dashboard.add_new_product'), 
      icon: PlusIcon, 
      path: '/supplier/product-listings',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      label: t('dashboard.view_orders'), 
      icon: ClipboardDocumentListIcon, 
      path: '/supplier/orders',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      label: t('dashboard.update_profile'), 
      icon: BuildingOfficeIcon, 
      path: '/supplier/profile',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      label: t('dashboard.view_analytics'), 
      icon: ChartBarIcon, 
      path: '/supplier/analytics',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Shipped': return 'text-green-600 bg-green-100';
      case 'Processing': return 'text-blue-600 bg-blue-100';
      case 'Delivered': return 'text-gray-600 bg-gray-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.supplier_dashboard')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('dashboard.welcome_message', { name: user?.firstName || 'User' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              {stat.change && (
                <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.recent_orders')}
          </h2>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                  <p className="text-xs text-gray-600">{order.product}</p>
                  <p className="text-xs text-gray-500 mt-1">{order.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{order.amount}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('dashboard.top_products')}
          </h2>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-600">{product.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{product.sales}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className={`${action.color} text-white p-4 rounded-lg text-center transition-colors`}
            >
              <action.icon className="h-6 w-6 mx-auto mb-2" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}