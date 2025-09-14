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

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  limits: any;
  isActive: boolean;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: string;
  userId: string;
  organizationId?: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  createdAt: string;
  plan: SubscriptionPlan;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
  planDistribution: Array<{
    planId: string;
    planName: string;
    count: number;
    revenue: number;
  }>;
  revenueGrowth: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
  churnAnalysis: Array<{
    month: string;
    churned: number;
    churnRate: number;
  }>;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  key: string;
  isActive: boolean;
  rolloutPercentage: number;
  targetSegments: string[];
  conditions: any;
  createdAt: string;
  updatedAt: string;
}

export default function SubscriptionManagementPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions' | 'analytics' | 'feature-flags' | 'billing'>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showCreateFlag, setShowCreateFlag] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'CHF',
    billingPeriod: 'monthly',
    features: [] as string[],
    limits: {
      users: 0,
      organizations: 0,
      jobListings: 0,
      productListings: 0,
      storageGB: 0,
      apiCalls: 0,
    },
    isActive: true,
    isPopular: false,
  });
  const [newFlag, setNewFlag] = useState({
    name: '',
    description: '',
    key: '',
    isActive: true,
    rolloutPercentage: 0,
    targetSegments: [] as string[],
    conditions: {},
  });

  const fetchPlans = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/plans', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }

      const data = await response.json();
      setPlans(data);
    } catch (err: any) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/subscriptions?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/analytics?timeRange=30d', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchFeatureFlags = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/feature-flags', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }

      const data = await response.json();
      setFeatureFlags(data);
    } catch (err: any) {
      console.error('Failed to fetch feature flags:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPlans(),
        fetchSubscriptions(),
        fetchAnalytics(),
        fetchFeatureFlags(),
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleCreatePlan = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlan),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription plan');
      }

      alert('Subscription plan created successfully!');
      setNewPlan({
        name: '',
        description: '',
        price: 0,
        currency: 'CHF',
        billingPeriod: 'monthly',
        features: [],
        limits: {
          users: 0,
          organizations: 0,
          jobListings: 0,
          productListings: 0,
          storageGB: 0,
          apiCalls: 0,
        },
        isActive: true,
        isPopular: false,
      });
      setShowCreatePlan(false);
      fetchPlans();
    } catch (err: any) {
      alert(`Failed to create plan: ${err.message}`);
    }
  };

  const handleCreateFlag = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/feature-flags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFlag),
      });

      if (!response.ok) {
        throw new Error('Failed to create feature flag');
      }

      alert('Feature flag created successfully!');
      setNewFlag({
        name: '',
        description: '',
        key: '',
        isActive: true,
        rolloutPercentage: 0,
        targetSegments: [],
        conditions: {},
      });
      setShowCreateFlag(false);
      fetchFeatureFlags();
    } catch (err: any) {
      alert(`Failed to create feature flag: ${err.message}`);
    }
  };

  const handleProcessBillingCycle = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/subscription-management/billing/process-cycle', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to process billing cycle');
      }

      alert('Billing cycle processed successfully!');
      fetchSubscriptions();
      fetchAnalytics();
    } catch (err: any) {
      alert(`Failed to process billing cycle: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'low';
      case 'inactive': return 'medium';
      case 'cancelled': return 'critical';
      case 'past_due': return 'high';
      case 'unpaid': return 'critical';
      default: return 'low';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading subscription management...</p>
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
            <h1 className="text-admin-text font-semibold tracking-tight">Subscription Management</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminButton 
              variant="primary" 
              size="sm"
              onClick={handleProcessBillingCycle}
            >
              Process Billing Cycle
            </AdminButton>
            <AdminButton 
              variant="outline" 
              size="sm"
              onClick={() => {
                fetchPlans();
                fetchSubscriptions();
                fetchAnalytics();
                fetchFeatureFlags();
              }}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AdminMetric
              label="Total Subscriptions"
              value={analytics.totalSubscriptions.toLocaleString()}
              change={{ value: 5, type: 'increase' }}
              icon="📊"
            />
            <AdminMetric
              label="Active Subscriptions"
              value={analytics.activeSubscriptions.toLocaleString()}
              change={{ value: 3, type: 'increase' }}
              icon="✅"
            />
            <AdminMetric
              label="Monthly Recurring Revenue"
              value={`CHF ${analytics.monthlyRecurringRevenue.toLocaleString()}`}
              change={{ value: 8, type: 'increase' }}
              icon="💰"
            />
            <AdminMetric
              label="Churn Rate"
              value={`${analytics.churnRate.toFixed(1)}%`}
              change={{ value: 2, type: 'decrease' }}
              icon="📉"
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'plans', label: 'Subscription Plans' },
              { id: 'subscriptions', label: 'Subscriptions' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'feature-flags', label: 'Feature Flags' },
              { id: 'billing', label: 'Billing' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-muted hover:text-admin-text hover:border-admin-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Subscription Plans Tab */}
        {activeTab === 'plans' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">Subscription Plans</h3>
              <AdminButton 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreatePlan(true)}
              >
                Create Plan
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Price</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Billing Period</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Features</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Popular</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {plans.map((plan) => (
                  <AdminTableRow key={plan.id}>
                    <AdminTableCell>
                      <div>
                        <div className="font-medium text-admin-text">{plan.name}</div>
                        <div className="text-sm text-admin-muted">{plan.description}</div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-admin-text">
                        {plan.currency} {plan.price}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant="low">
                        {plan.billingPeriod}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-sm text-admin-text">
                        {plan.features.length} features
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={plan.isActive ? 'low' : 'medium'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      {plan.isPopular && (
                        <AdminBadge variant="high">Popular</AdminBadge>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          Edit
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          View
                        </AdminButton>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">Subscriptions</h3>
              <AdminButton variant="primary" size="sm">
                Create Subscription
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>User</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Organization</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Plan</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Period End</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {subscriptions.map((subscription) => (
                  <AdminTableRow key={subscription.id}>
                    <AdminTableCell>
                      <div>
                        <div className="font-medium text-admin-text">
                          {subscription.user.firstName} {subscription.user.lastName}
                        </div>
                        <div className="text-sm text-admin-muted">{subscription.user.email}</div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {subscription.organization ? (
                        <div className="text-admin-text">{subscription.organization.name}</div>
                      ) : (
                        <span className="text-admin-muted">-</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-admin-text">{subscription.plan.name}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-sm text-admin-text">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          Edit
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          View
                        </AdminButton>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Revenue Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">MRR</label>
                  <p className="text-2xl font-bold text-admin-text">CHF {analytics.monthlyRecurringRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">ARR</label>
                  <p className="text-2xl font-bold text-admin-text">CHF {analytics.annualRecurringRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">ARPU</label>
                  <p className="text-2xl font-bold text-admin-text">CHF {analytics.averageRevenuePerUser.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Churn Rate</label>
                  <p className="text-2xl font-bold text-admin-text">{analytics.churnRate.toFixed(1)}%</p>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Plan Distribution</h3>
              <div className="space-y-3">
                {analytics.planDistribution.map((plan) => (
                  <div key={plan.planId} className="flex items-center justify-between">
                    <span className="text-admin-text">{plan.planName}</span>
                    <div className="flex items-center gap-4">
                      <AdminBadge variant="low">{plan.count} subscribers</AdminBadge>
                      <span className="text-admin-text font-medium">CHF {plan.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* Feature Flags Tab */}
        {activeTab === 'feature-flags' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">Feature Flags</h3>
              <AdminButton 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateFlag(true)}
              >
                Create Feature Flag
              </AdminButton>
            </div>
            
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Key</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Rollout</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Created</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {featureFlags.map((flag) => (
                  <AdminTableRow key={flag.id}>
                    <AdminTableCell>
                      <div>
                        <div className="font-medium text-admin-text">{flag.name}</div>
                        <div className="text-sm text-admin-muted">{flag.description}</div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{flag.key}</code>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-admin-text">{flag.rolloutPercentage}%</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={flag.isActive ? 'low' : 'medium'}>
                        {flag.isActive ? 'Active' : 'Inactive'}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm">
                          Edit
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm">
                          Toggle
                        </AdminButton>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-text mb-6">Billing Management</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-admin-text">Billing Operations</h4>
                <AdminButton 
                  variant="primary" 
                  className="w-full"
                  onClick={handleProcessBillingCycle}
                >
                  Process Billing Cycle
                </AdminButton>
                <AdminButton 
                  variant="secondary" 
                  className="w-full"
                >
                  Process Failed Payments
                </AdminButton>
                <AdminButton 
                  variant="outline" 
                  className="w-full"
                >
                  Generate Invoices
                </AdminButton>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-admin-text">Billing Analytics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-admin-text">Total Revenue</span>
                    <span className="font-medium text-admin-text">CHF 0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text">Payment Success Rate</span>
                    <span className="font-medium text-admin-text">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text">Refund Rate</span>
                    <span className="font-medium text-admin-text">2%</span>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        )}

        {/* Create Plan Modal */}
        {showCreatePlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Create Subscription Plan</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Name</label>
                    <input
                      type="text"
                      className="admin-input w-full px-3 py-2"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Price (CHF)</label>
                    <input
                      type="number"
                      className="admin-input w-full px-3 py-2"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Description</label>
                  <textarea
                    className="admin-input w-full px-3 py-2"
                    rows={3}
                    value={newPlan.description}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Billing Period</label>
                    <select
                      className="admin-input w-full px-3 py-2"
                      value={newPlan.billingPeriod}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, billingPeriod: e.target.value }))}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={newPlan.isActive}
                        onChange={(e) => setNewPlan(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                      Active
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={newPlan.isPopular}
                        onChange={(e) => setNewPlan(prev => ({ ...prev, isPopular: e.target.checked }))}
                      />
                      Popular
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <AdminButton variant="primary" onClick={handleCreatePlan}>
                  Create Plan
                </AdminButton>
                <AdminButton variant="outline" onClick={() => setShowCreatePlan(false)}>
                  Cancel
                </AdminButton>
              </div>
            </div>
          </div>
        )}

        {/* Create Feature Flag Modal */}
        {showCreateFlag && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-admin-text mb-4">Create Feature Flag</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Name</label>
                    <input
                      type="text"
                      className="admin-input w-full px-3 py-2"
                      value={newFlag.name}
                      onChange={(e) => setNewFlag(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Key</label>
                    <input
                      type="text"
                      className="admin-input w-full px-3 py-2"
                      value={newFlag.key}
                      onChange={(e) => setNewFlag(prev => ({ ...prev, key: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Description</label>
                  <textarea
                    className="admin-input w-full px-3 py-2"
                    rows={3}
                    value={newFlag.description}
                    onChange={(e) => setNewFlag(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1">Rollout Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="admin-input w-full px-3 py-2"
                      value={newFlag.rolloutPercentage}
                      onChange={(e) => setNewFlag(prev => ({ ...prev, rolloutPercentage: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={newFlag.isActive}
                        onChange={(e) => setNewFlag(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <AdminButton variant="primary" onClick={handleCreateFlag}>
                  Create Feature Flag
                </AdminButton>
                <AdminButton variant="outline" onClick={() => setShowCreateFlag(false)}>
                  Cancel
                </AdminButton>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </main>
    </div>
  );
}