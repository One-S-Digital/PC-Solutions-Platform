import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { CalendarDaysIcon, TruckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { apiCall } from '../../utils/api';

type ServiceRequest = {
  id: string;
  description?: string | null;
  status: string;
  createdAt: string;
  scheduledAt?: string | null;
  organization?: {
    name: string;
  };
  service?: {
    title: string;
    provider?: {
      organization?: {
        name: string;
      };
    };
  };
};

type Order = {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  organization?: {
    name: string;
  };
};

type AppointmentsResponse = {
  serviceRequests: ServiceRequest[];
  orders: Order[];
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
};

const FoundationAppointmentsPage: React.FC = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppointmentsResponse>({ serviceRequests: [], orders: [] });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const response = await apiCall('/dashboard/foundation/appointments', { headers });
      if (!response.ok) {
        throw new Error('Unable to fetch appointments');
      }
      const json = await response.json();
      setData(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const upcomingRequests = useMemo(() => {
    const now = new Date();
    return [...data.serviceRequests]
      .sort((a, b) => {
        const aDate = a.scheduledAt ? new Date(a.scheduledAt).getTime() : new Date(a.createdAt).getTime();
        const bDate = b.scheduledAt ? new Date(b.scheduledAt).getTime() : new Date(b.createdAt).getTime();
        return aDate - bDate;
      })
      .filter((request) => {
        if (!request.scheduledAt) return true;
        return new Date(request.scheduledAt) >= now;
      });
  }, [data.serviceRequests]);

  const recentOrders = useMemo(() => {
    return [...data.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data.orders]);

  const totalUpcomingValue = useMemo(() => {
    return recentOrders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
  }, [recentOrders]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-swiss-mint/30 border-t-swiss-mint" />
            <p className="mt-3 text-sm text-gray-500">Loading appointments and requests…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-semibold">We couldn’t load your appointments</h2>
          <p className="mt-2 text-sm">{error}</p>
          <Button className="mt-4" variant="light" onClick={fetchData}>
            Retry loading data
          </Button>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-swiss-charcoal">Upcoming service requests</h2>
              <p className="text-sm text-gray-500">Keep track of visits scheduled with marketplace partners.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData} leftIcon={ArrowPathIcon}>
              Refresh
            </Button>
          </div>

          <ul className="mt-6 space-y-4">
            {upcomingRequests.length === 0 && (
              <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No service requests scheduled. Create a request from the marketplace to see it listed here.
              </li>
            )}
            {upcomingRequests.map((request) => {
              const scheduledDate = request.scheduledAt
                ? new Date(request.scheduledAt)
                : new Date(request.createdAt);
              return (
                <li key={request.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-swiss-charcoal">{request.service?.title ?? 'Service request'}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Provider: {request.service?.provider?.organization?.name ?? 'Pending assignment'}
                      </p>
                      {request.description && (
                        <p className="mt-2 text-xs text-gray-500">{request.description}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        statusColor[request.status] ?? 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <CalendarDaysIcon className="h-4 w-4 text-swiss-teal" />
                    <span>{scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-swiss-charcoal">Recent marketplace orders</h2>
              <p className="text-sm text-gray-500">Deliveries and purchases made by your foundation.</p>
            </div>
            <div className="rounded-xl bg-swiss-mint/10 px-4 py-2 text-sm font-semibold text-swiss-teal">
              Total value: {new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(totalUpcomingValue)}
            </div>
          </div>

          <ul className="mt-6 space-y-4">
            {recentOrders.length === 0 && (
              <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No marketplace orders recorded yet.
              </li>
            )}
            {recentOrders.map((order) => (
              <li key={order.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-swiss-charcoal">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ordered on {new Date(order.createdAt).toLocaleDateString()} by {order.organization?.name ?? 'Your foundation'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Value:{' '}
                      {new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(order.totalAmount ?? 0)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full bg-swiss-mint/10 px-3 py-1 text-xs font-semibold text-swiss-teal`}
                  >
                    <TruckIcon className="h-4 w-4" />
                    {order.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout title="Appointments & Marketplace" subtitle="Coordinate service visits and track orders">
      {renderContent()}
    </DashboardLayout>
  );
};

export default FoundationAppointmentsPage;
