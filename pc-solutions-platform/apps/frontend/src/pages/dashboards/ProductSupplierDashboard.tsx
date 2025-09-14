import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Badge, 
  Status,
  ThemeToggle
} from '@repo/ui';

interface SupplierStats {
  totalOrders: number;
  monthlyRevenue: number;
  activeCustomers: number;
  pendingOrders: number;
  inventoryItems: number;
  lowStockItems: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  orderDate: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

export default function ProductSupplierDashboard() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Fetch dashboard data
      const [statsResponse, ordersResponse] = await Promise.all([
        fetch('/api/dashboard/supplier/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dashboard/supplier/orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setRecentOrders(ordersData.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks: QuickLink[] = [
    {
      title: 'Manage Products',
      description: 'Add and update your product catalog',
      href: '/marketplace/products',
      icon: '📦',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'View Orders',
      description: 'Process and track customer orders',
      href: '/orders',
      icon: '📋',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Inventory',
      description: 'Monitor stock levels and reorder',
      href: '/inventory',
      icon: '📊',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Customers',
      description: 'Manage customer relationships',
      href: '/customers',
      icon: '👥',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Analytics',
      description: 'View sales and performance data',
      href: '/analytics',
      icon: '📈',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      title: 'Messages',
      description: 'Communicate with customers',
      href: '/messages',
      icon: '💬',
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'shipped': return 'info';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-surface-1/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-accent"></div>
          <h1 className="text-text-strong font-semibold tracking-tight">Supplier Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Product Supplier</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-strong">Welcome back!</h1>
          <p className="text-text-muted mt-2">Manage your product catalog and orders.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-accent">{stats?.totalOrders || 0}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold text-accent">CHF {stats?.monthlyRevenue || 0}</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Active Customers</p>
                <p className="text-2xl font-bold text-accent">{stats?.activeCustomers || 0}</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Pending Orders</p>
                <p className="text-2xl font-bold text-accent">{stats?.pendingOrders || 0}</p>
              </div>
              <div className="text-2xl">⏳</div>
            </div>
          </SwissCard>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-text-strong mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => (
              <SwissCard key={index} className="p-6 hover:shadow-float transition-all duration-150 cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${link.color}`}>
                    {link.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-strong mb-1">{link.title}</h3>
                    <p className="text-text-muted text-sm">{link.description}</p>
                  </div>
                </div>
              </SwissCard>
            ))}
          </div>
        </div>

        {/* Recent Orders & Inventory Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Recent Orders</h2>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm">
                      📦
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text-strong">{order.productName}</h4>
                      <p className="text-text-muted text-sm">{order.customerName} • Qty: {order.quantity}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                        <span className="text-text-subtle text-xs">
                          CHF {order.totalAmount} • {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-text-muted">No recent orders</p>
                </div>
              )}
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Inventory Status</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                  ✅
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Total Products</h4>
                  <p className="text-text-muted text-sm">{stats?.inventoryItems || 0} items in catalog</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-sm">
                  ⚠️
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Low Stock Alert</h4>
                  <p className="text-text-muted text-sm">{stats?.lowStockItems || 0} items need restocking</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  📈
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Top Seller</h4>
                  <p className="text-text-muted text-sm">Educational Blocks - 45 units sold this month</p>
                </div>
              </div>
            </div>
          </SwissCard>
        </div>
      </main>
    </div>
  );
}