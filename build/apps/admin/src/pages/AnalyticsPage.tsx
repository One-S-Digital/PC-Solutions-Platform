import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  AdminCard, 
  AdminButton, 
  AdminMetric, 
  AdminBadge,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from '@repo/ui';

interface AnalyticsData {
  users: {
    totalUsers: number;
    activeUsers: number;
    registrations: Array<{ date: string; count: number }>;
    usersByRole: Array<{ role: string; count: number }>;
  };
  organizations: {
    totalOrganizations: number;
    activeOrganizations: number;
    registrations: Array<{ date: string; count: number }>;
    orgsByType: Array<{ type: string; count: number }>;
  };
  products: {
    totalProducts: number;
    newProducts: number;
    productsByCategory: Array<{ category: string; count: number }>;
    productsByStatus: Array<{ status: string; count: number }>;
  };
  jobs: {
    totalJobs: number;
    totalApplications: number;
    newJobs: number;
    newApplications: number;
    jobsByStatus: Array<{ status: string; count: number }>;
  };
  revenue: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    revenueByPlan: Array<{ planName: string; count: number; revenue: number }>;
  };
  system: {
    apiRequests: number;
    dbConnections: number;
    slowQueries: number;
    storageUsed: number;
  };
  lastUpdated: string;
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`/api/admin/analytics/overview?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-admin-text mb-2">Error Loading Analytics</h2>
          <p className="text-admin-muted mb-4">{error}</p>
          <AdminButton onClick={fetchAnalytics}>Retry</AdminButton>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-admin-text mb-2">No Data Available</h2>
          <p className="text-admin-muted">Analytics data is not available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <div className="admin-header sticky top-0 z-40 backdrop-blur bg-admin-surface/80 border-b border-admin-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 rounded-full bg-admin-accent"></div>
            <h1 className="text-admin-text font-semibold tracking-tight">Platform Analytics</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              className="admin-input px-3 py-1"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <AdminButton onClick={fetchAnalytics} size="sm">
              Refresh
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminMetric
            label="Total Users"
            value={analyticsData.users.totalUsers.toLocaleString()}
            change={{ value: 12, type: 'increase' }}
            icon="👥"
          />
          <AdminMetric
            label="Active Users"
            value={analyticsData.users.activeUsers.toLocaleString()}
            change={{ value: 8, type: 'increase' }}
            icon="🔗"
          />
          <AdminMetric
            label="Organizations"
            value={analyticsData.organizations.totalOrganizations.toLocaleString()}
            change={{ value: 5, type: 'increase' }}
            icon="🏢"
          />
          <AdminMetric
            label="Total Revenue"
            value={`CHF ${analyticsData.revenue.totalRevenue.toLocaleString()}`}
            change={{ value: 15, type: 'increase' }}
            icon="💰"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminMetric
            label="Products"
            value={analyticsData.products.totalProducts.toLocaleString()}
            change={{ value: analyticsData.products.newProducts, type: 'increase' }}
            icon="📦"
          />
          <AdminMetric
            label="Job Listings"
            value={analyticsData.jobs.totalJobs.toLocaleString()}
            change={{ value: analyticsData.jobs.newJobs, type: 'increase' }}
            icon="💼"
          />
          <AdminMetric
            label="Applications"
            value={analyticsData.jobs.totalApplications.toLocaleString()}
            change={{ value: analyticsData.jobs.newApplications, type: 'increase' }}
            icon="📝"
          />
          <AdminMetric
            label="Active Subscriptions"
            value={analyticsData.revenue.activeSubscriptions.toLocaleString()}
            change={{ value: 3, type: 'increase' }}
            icon="📊"
          />
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AdminMetric
            label="API Requests"
            value={analyticsData.system.apiRequests.toLocaleString()}
            change={{ value: 10, type: 'increase' }}
            icon="⚡"
          />
          <AdminMetric
            label="DB Connections"
            value={analyticsData.system.dbConnections.toString()}
            change={{ value: 2, type: 'increase' }}
            icon="🗄️"
          />
          <AdminMetric
            label="Storage Used"
            value={`${analyticsData.system.storageUsed} GB`}
            change={{ value: 5, type: 'increase' }}
            icon="💾"
          />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users by Role */}
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-text mb-4">Users by Role</h3>
            <div className="space-y-3">
              {analyticsData.users.usersByRole.map((role) => (
                <div key={role.role} className="flex items-center justify-between">
                  <span className="text-admin-text capitalize">{role.role.toLowerCase()}</span>
                  <AdminBadge variant="low">{role.count}</AdminBadge>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Organizations by Type */}
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-text mb-4">Organizations by Type</h3>
            <div className="space-y-3">
              {analyticsData.organizations.orgsByType.map((org) => (
                <div key={org.type} className="flex items-center justify-between">
                  <span className="text-admin-text capitalize">{org.type.toLowerCase()}</span>
                  <AdminBadge variant="low">{org.count}</AdminBadge>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Products and Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Products by Category */}
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-text mb-4">Products by Category</h3>
            <div className="space-y-3">
              {analyticsData.products.productsByCategory.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <span className="text-admin-text capitalize">{category.category.toLowerCase()}</span>
                  <AdminBadge variant="low">{category.count}</AdminBadge>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Jobs by Status */}
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-text mb-4">Jobs by Status</h3>
            <div className="space-y-3">
              {analyticsData.jobs.jobsByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <span className="text-admin-text capitalize">{status.status.toLowerCase()}</span>
                  <AdminBadge variant="low">{status.count}</AdminBadge>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Revenue Breakdown */}
        <AdminCard className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-admin-text mb-4">Revenue by Subscription Plan</h3>
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableHeaderCell>Plan Name</AdminTableHeaderCell>
                <AdminTableHeaderCell>Subscribers</AdminTableHeaderCell>
                <AdminTableHeaderCell>Revenue</AdminTableHeaderCell>
                <AdminTableHeaderCell>Percentage</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {analyticsData.revenue.revenueByPlan.map((plan) => {
                const percentage = analyticsData.revenue.totalRevenue > 0 
                  ? ((plan.revenue / analyticsData.revenue.totalRevenue) * 100).toFixed(1)
                  : '0';
                
                return (
                  <AdminTableRow key={plan.planName}>
                    <AdminTableCell>{plan.planName}</AdminTableCell>
                    <AdminTableCell>{plan.count}</AdminTableCell>
                    <AdminTableCell>CHF {plan.revenue.toLocaleString()}</AdminTableCell>
                    <AdminTableCell>{percentage}%</AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        </AdminCard>

        {/* Last Updated */}
        <div className="text-center text-admin-muted text-sm">
          Last updated: {new Date(analyticsData.lastUpdated).toLocaleString()}
        </div>
      </main>
    </div>
  );
}