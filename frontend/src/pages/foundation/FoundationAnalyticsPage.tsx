import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { apiCall } from '../../utils/api';

type FoundationStats = {
  totalJobListings: number;
  totalApplications: number;
  totalOrders: number;
  totalServiceRequests: number;
  activeJobListings: number;
  pendingApplications: number;
};

type Lead = {
  id: string;
  status: string;
  createdAt: string;
};

type AppointmentsResponse = {
  serviceRequests: Array<{ status: string; createdAt: string; scheduledAt?: string | null }>;
  orders: Array<{ totalAmount: number; createdAt: string }>;
};

type ProfileResponse = {
  organizations?: Array<{
    organization: {
      id: string;
      type?: string;
    };
  }>;
};

const statusPalette: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-600',
  ASSIGNED: 'bg-amber-50 text-amber-600',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-600',
  CONVERTED: 'bg-emerald-50 text-emerald-600',
  LOST: 'bg-rose-50 text-rose-600',
};

const FoundationAnalyticsPage: React.FC = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FoundationStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<AppointmentsResponse>({ serviceRequests: [], orders: [] });

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      const profileResponse = await apiCall('/profiles/me', { headers });
      if (!profileResponse.ok) {
        throw new Error('Unable to load foundation details');
      }
      const profileJson = await profileResponse.json();
      const profileData: ProfileResponse = profileJson.data ?? profileJson;
      const foundationLink = profileData.organizations?.find(
        (link) => link.organization?.type === 'FOUNDATION' || link.organization?.type === undefined,
      );

      if (!foundationLink) {
        throw new Error('No foundation organisation associated with this account.');
      }

      const [statsResponse, leadsResponse, appointmentsResponse] = await Promise.all([
        apiCall('/dashboard/foundation/stats', { headers }),
        apiCall(`/leads/parent-leads?foundationId=${foundationLink.organization.id}`, { headers }),
        apiCall('/dashboard/foundation/appointments', { headers }),
      ]);

      if (!statsResponse.ok || !leadsResponse.ok || !appointmentsResponse.ok) {
        throw new Error('Failed to load analytics data from the server.');
      }

      const statsJson = await statsResponse.json();
      const leadsJson = await leadsResponse.json();
      const appointmentsJson = await appointmentsResponse.json();

      setStats(statsJson.data ?? statsJson);
      setLeads((leadsJson.data ?? leadsJson) as Lead[]);
      setAppointments(appointmentsJson.data ?? appointmentsJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics at this time.');
    } finally {
      setLoading(false);
    }
  };

  const leadMetrics = useMemo(() => {
    const byStatus = leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.status] = (acc[lead.status] ?? 0) + 1;
      return acc;
    }, {});

    const createdThisMonth = leads.filter((lead) => {
      const created = new Date(lead.createdAt);
      const now = new Date();
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    }).length;

    return {
      total: leads.length,
      byStatus,
      createdThisMonth,
    };
  }, [leads]);

  const orderMetrics = useMemo(() => {
    const totalValue = appointments.orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    const thisMonthValue = appointments.orders.reduce((sum, order) => {
      const created = new Date(order.createdAt);
      const now = new Date();
      if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) {
        return sum + (order.totalAmount ?? 0);
      }
      return sum;
    }, 0);
    return {
      count: appointments.orders.length,
      totalValue,
      thisMonthValue,
    };
  }, [appointments.orders]);

  const serviceMetrics = useMemo(() => {
    const upcoming = appointments.serviceRequests.filter((req) => {
      if (!req.createdAt) return false;
      if (!req.scheduledAt) return true;
      return new Date(req.scheduledAt) >= new Date();
    }).length;
    return {
      total: appointments.serviceRequests.length,
      upcoming,
    };
  }, [appointments.serviceRequests]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-swiss-mint/30 border-t-swiss-mint" />
            <p className="mt-3 text-sm text-gray-500">Calculating analytics…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-semibold">We couldn’t load your analytics</h2>
          <p className="mt-2 text-sm">{error}</p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total leads</p>
            <p className="mt-3 text-3xl font-bold text-swiss-charcoal">{leadMetrics.total}</p>
            <p className="text-xs text-gray-500">{leadMetrics.createdThisMonth} created this month</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Job listings</p>
            <p className="mt-3 text-3xl font-bold text-swiss-charcoal">{stats?.activeJobListings ?? 0}</p>
            <p className="text-xs text-gray-500">{stats?.totalJobListings ?? 0} total listings</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Marketplace orders</p>
            <p className="mt-3 text-3xl font-bold text-swiss-charcoal">{orderMetrics.count}</p>
            <p className="text-xs text-gray-500">
              {new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(orderMetrics.thisMonthValue)} spent this month
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Service requests</p>
            <p className="mt-3 text-3xl font-bold text-swiss-charcoal">{serviceMetrics.total}</p>
            <p className="text-xs text-gray-500">{serviceMetrics.upcoming} upcoming engagements</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-swiss-charcoal">Lead pipeline distribution</h2>
              <UsersIcon className="h-6 w-6 text-swiss-teal" />
            </div>
            <ul className="mt-6 space-y-3">
              {Object.entries(leadMetrics.byStatus).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusPalette[status] ?? 'bg-gray-50 text-gray-600'}`}>
                      {status}
                    </span>
                    <span className="text-sm text-swiss-charcoal">{statusOptionsLabel(status)}</span>
                  </div>
                  <span className="text-sm font-semibold text-swiss-charcoal">{count}</span>
                </li>
              ))}
              {Object.keys(leadMetrics.byStatus).length === 0 && (
                <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  No leads have been created yet.
                </li>
              )}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-swiss-charcoal">Operational snapshot</h2>
              <ChartBarIcon className="h-6 w-6 text-swiss-teal" />
            </div>
            <dl className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 font-medium text-swiss-charcoal">
                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-swiss-teal" /> Pending applications
                </dt>
                <dd className="font-semibold text-swiss-charcoal">{stats?.pendingApplications ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 font-medium text-swiss-charcoal">
                  <ShoppingBagIcon className="h-4 w-4 text-swiss-teal" /> Lifetime marketplace spend
                </dt>
                <dd className="font-semibold text-swiss-charcoal">
                  {new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(orderMetrics.totalValue)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 font-medium text-swiss-charcoal">
                  <SparklesIcon className="h-4 w-4 text-swiss-teal" /> Conversion rate
                </dt>
                <dd className="font-semibold text-swiss-charcoal">
                  {leadMetrics.total === 0
                    ? '—'
                    : `${Math.round(((leadMetrics.byStatus.CONVERTED ?? 0) / leadMetrics.total) * 100)}%`}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout title="Analytics" subtitle="Understand how your organisation is performing">
      {renderContent()}
    </DashboardLayout>
  );
};

const statusOptionsLabel = (status: string) => {
  switch (status) {
    case 'NEW':
      return 'New enquiries';
    case 'ASSIGNED':
      return 'Assigned to team';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'CONVERTED':
      return 'Converted families';
    case 'LOST':
      return 'Closed';
    default:
      return status;
  }
};

export default FoundationAnalyticsPage;
