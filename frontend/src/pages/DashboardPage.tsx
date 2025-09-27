import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  UsersIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { apiCall } from '../utils/api';

type FoundationStats = {
  totalJobListings: number;
  totalApplications: number;
  totalOrders: number;
  totalServiceRequests: number;
  activeJobListings: number;
  pendingApplications: number;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status?: string;
};

type Lead = {
  id: string;
  parentName: string;
  childName: string;
  status: string;
  createdAt: string;
  preferredLocation?: string | null;
  preferredLanguages?: string[] | null;
};

type ServiceRequest = {
  id: string;
  description?: string | null;
  status: string;
  createdAt: string;
  scheduledAt?: string | null;
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
};

type OrganizationMember = {
  id: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

type FoundationOrganization = {
  id: string;
  name: string;
  type?: string;
  canton?: string | null;
  region?: string | null;
  languages?: string[] | null;
  capacity?: number | null;
  pedagogy?: string[] | null;
  members?: OrganizationMember[];
};

type ProfileResponse = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  clerkId: string;
  organizations?: Array<{
    organization: FoundationOrganization;
  }>;
};

type AppointmentsResponse = {
  serviceRequests: ServiceRequest[];
  orders: Order[];
};

type StatCard = {
  title: string;
  value: number;
  meta: string;
  trendPercentage: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(value);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FoundationStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<AppointmentsResponse>({ serviceRequests: [], orders: [] });
  const [organization, setOrganization] = useState<FoundationOrganization | null>(null);
  const [teamRecipients, setTeamRecipients] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [quickMessage, setQuickMessage] = useState('');
  const [quickMessageStatus, setQuickMessageStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      const profileResponse = await apiCall('/profiles/me', { headers });
      if (!profileResponse.ok) {
        throw new Error('Failed to load profile details.');
      }
      const profileJson = await profileResponse.json();
      const profileData: ProfileResponse = profileJson.data ?? profileJson;

      const foundationLink = profileData.organizations?.find(
        (link) => link.organization?.type === 'FOUNDATION' || link.organization?.type === undefined,
      );

      if (!foundationLink) {
        throw new Error('No foundation organization is linked to this account.');
      }

      setOrganization(foundationLink.organization);

      const foundationId = foundationLink.organization.id;

      const [statsResponse, activitiesResponse, leadsResponse, appointmentsResponse] = await Promise.all([
        apiCall('/dashboard/foundation/stats', { headers }),
        apiCall('/dashboard/foundation/activities', { headers }),
        apiCall(`/leads/parent-leads?foundationId=${foundationId}`, { headers }),
        apiCall('/dashboard/foundation/appointments', { headers }),
      ]);

      if (statsResponse.ok) {
        const statsJson = await statsResponse.json();
        setStats(statsJson.data ?? statsJson);
      }

      if (activitiesResponse.ok) {
        const activitiesJson = await activitiesResponse.json();
        setActivities((activitiesJson.data ?? activitiesJson) as ActivityItem[]);
      }

      if (leadsResponse.ok) {
        const leadsJson = await leadsResponse.json();
        setLeads((leadsJson.data ?? leadsJson) as Lead[]);
      }

      if (appointmentsResponse.ok) {
        const appointmentsJson = await appointmentsResponse.json();
        setAppointments((appointmentsJson.data ?? appointmentsJson) as AppointmentsResponse);
      }

      // Prepare recipient list from organization members
      const members = foundationLink.organization.members || [];
      const mappedTeam = members
        .filter((member) => member.user && member.user.id && member.user.id !== profileData.id)
        .map((member) => ({
          id: member.user.id,
          label: `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim() || member.user.email,
        }));

      if (mappedTeam.length > 0) {
        setTeamRecipients(mappedTeam);
        setSelectedRecipientId(mappedTeam[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const leadSummary = useMemo(() => {
    const summary = leads.reduce<Record<string, number>>((acc, lead) => {
      const status = lead.status || 'UNKNOWN';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const totalLeads = leads.length;
    const newLeads = summary.NEW ?? 0;
    const assignedLeads = (summary.ASSIGNED ?? 0) + (summary.CONTACTED ?? 0);
    const convertedLeads = summary.CONVERTED ?? 0;

    return {
      totalLeads,
      newLeads,
      assignedLeads,
      convertedLeads,
      summary,
    };
  }, [leads]);

  const upcomingServiceRequests = useMemo(() => {
    const now = new Date();
    return [...appointments.serviceRequests]
      .filter((request) => {
        if (!request.scheduledAt) return true;
        const scheduled = new Date(request.scheduledAt);
        return scheduled >= now;
      })
      .sort((a, b) => {
        const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : new Date(a.createdAt).getTime();
        const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : new Date(b.createdAt).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [appointments.serviceRequests]);

  const monthlyOrderMetrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = appointments.orders.filter((order) => new Date(order.createdAt) >= startOfMonth);
    const totalSpend = ordersThisMonth.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    return {
      ordersThisMonth: ordersThisMonth.length,
      totalSpend,
    };
  }, [appointments.orders]);

  const statCards: StatCard[] = useMemo(() => {
    const cards: StatCard[] = [];
    const totalJobs = stats?.totalJobListings ?? 0;
    const activeJobs = stats?.activeJobListings ?? 0;
    const jobActivityRatio = totalJobs > 0 ? Math.round((activeJobs / totalJobs) * 100) : 0;

    cards.push({
      title: 'Active Job Listings',
      value: activeJobs,
      meta: `${totalJobs} total listings`,
      trendPercentage: jobActivityRatio,
      icon: BriefcaseIcon,
      accent: 'bg-swiss-mint/10 text-swiss-mint',
    });

    const totalApplications = stats?.totalApplications ?? 0;
    const pendingApplications = stats?.pendingApplications ?? 0;
    const applicationRatio = totalApplications > 0 ? Math.round((pendingApplications / totalApplications) * 100) : 0;

    cards.push({
      title: 'Pending Applications',
      value: pendingApplications,
      meta: `${totalApplications} total applications`,
      trendPercentage: applicationRatio,
      icon: ClipboardDocumentCheckIcon,
      accent: 'bg-swiss-teal/10 text-swiss-teal',
    });

    const totalOrders = stats?.totalOrders ?? 0;
    const monthlyOrders = monthlyOrderMetrics.ordersThisMonth;
    const orderTrend = totalOrders > 0 ? Math.round((monthlyOrders / totalOrders) * 100) : 0;

    cards.push({
      title: 'Orders this Month',
      value: monthlyOrders,
      meta: `${totalOrders} orders lifetime`,
      trendPercentage: orderTrend,
      icon: ShoppingBagIcon,
      accent: 'bg-swiss-coral/10 text-swiss-coral',
    });

    const totalServiceRequests = stats?.totalServiceRequests ?? 0;
    const upcomingCount = upcomingServiceRequests.length;
    const serviceTrend = totalServiceRequests > 0 ? Math.round((upcomingCount / totalServiceRequests) * 100) : 0;

    cards.push({
      title: 'Upcoming Service Requests',
      value: upcomingCount,
      meta: `${totalServiceRequests} requests recorded`,
      trendPercentage: serviceTrend,
      icon: CalendarDaysIcon,
      accent: 'bg-swiss-sand/20 text-swiss-sand-dark',
    });

    return cards;
  }, [stats, monthlyOrderMetrics, upcomingServiceRequests.length]);

  const activityIconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    application: UsersIcon,
    order: ShoppingBagIcon,
    service: AcademicCapIcon,
    job: BriefcaseIcon,
  };

  const firstName = useMemo(() => {
    if (clerkUser?.fullName) {
      return clerkUser.fullName.split(' ')[0];
    }
    if (clerkUser?.firstName) {
      return clerkUser.firstName;
    }
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    return email ? email.split('@')[0] : 'there';
  }, [clerkUser]);

  const handleQuickMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickMessage.trim() || !selectedRecipientId) {
      return;
    }

    try {
      setQuickMessageStatus('sending');
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const conversationResponse = await apiCall('/messaging/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'DIRECT',
          participantIds: [selectedRecipientId],
        }),
      });

      if (!conversationResponse.ok) {
        throw new Error('Failed to start the conversation.');
      }

      const conversationJson = await conversationResponse.json();
      const conversationId = conversationJson.id ?? conversationJson.data?.id;
      if (!conversationId) {
        throw new Error('Missing conversation identifier.');
      }

      const messageResponse = await apiCall('/messaging/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId,
          content: quickMessage.trim(),
          messageType: 'TEXT',
        }),
      });

      if (!messageResponse.ok) {
        throw new Error('Message could not be delivered.');
      }

      setQuickMessage('');
      setQuickMessageStatus('sent');
      setTimeout(() => setQuickMessageStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setQuickMessageStatus('error');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-swiss-mint/40 border-t-swiss-mint" />
            <p className="mt-4 text-sm text-gray-500">Loading your foundation data…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-semibold">We couldn’t load the dashboard</h2>
          <p className="mt-2 text-sm">{error}</p>
          <Button className="mt-4" onClick={fetchDashboardData} variant="light">
            Retry loading data
          </Button>
        </Card>
      );
    }

    return (
      <>
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const IconComponent = stat.icon;
            const isPositive = stat.trendPercentage >= 0;
            const TrendIcon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
            return (
              <Card key={stat.title} className="p-5" hoverEffect>
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.accent}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <TrendIcon className="h-4 w-4" />
                    {Math.abs(stat.trendPercentage)}%
                  </span>
                </div>
                <p className="mt-6 text-3xl font-bold text-swiss-charcoal">{stat.value}</p>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-1 text-xs text-gray-400">{stat.meta}</p>
              </Card>
            );
          })}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-swiss-charcoal">Recent Activity</h2>
                  <p className="text-sm text-gray-500">Live updates from recruiting, marketplace, and service teams.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-swiss-teal hover:text-swiss-mint"
                  onClick={() => navigate('/analytics')}
                >
                  View analytics
                </Button>
              </div>
              <ul className="mt-6 space-y-4">
                {activities.length === 0 && (
                  <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    No activity recorded yet — once your team starts working, updates will appear here.
                  </li>
                )}
                {activities.map((activity) => {
                  const ActivityIcon = activityIconMap[activity.type] ?? ChartBarIcon;
                  const timestamp = new Date(activity.timestamp);
                  return (
                    <li
                      key={activity.id}
                      className="flex items-start gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-swiss-mint/20 hover:bg-swiss-mint/5"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-swiss-mint/10 text-swiss-teal">
                        <ActivityIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-swiss-charcoal">
                          <span className="font-semibold">{activity.title}</span>
                        </p>
                        <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          {timestamp.toLocaleDateString()} • {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {activity.status ? ` • ${activity.status}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="light"
                        size="sm"
                        className="text-xs font-semibold"
                        onClick={() => navigate('/messages')}
                        leftIcon={ChatBubbleLeftRightIcon}
                      >
                        Follow up
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-swiss-charcoal">Upcoming Service Requests</h2>
                  <p className="text-sm text-gray-500">Stay ahead of scheduled maintenance and support engagements.</p>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {upcomingServiceRequests.length === 0 && (
                  <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    No upcoming service requests. Schedule a new request from the marketplace to see it here.
                  </li>
                )}
                {upcomingServiceRequests.map((request) => {
                  const scheduledDate = request.scheduledAt
                    ? new Date(request.scheduledAt)
                    : new Date(request.createdAt);
                  return (
                    <li
                      key={request.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-swiss-charcoal">
                          {request.service?.title ?? 'Service request'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Provider: {request.service?.provider?.organization?.name ?? 'Pending assignment'}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          Scheduled {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="rounded-full bg-swiss-mint/10 px-3 py-1 text-xs font-semibold text-swiss-teal">
                        {request.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal">Quick Actions</h2>
              <p className="mt-1 text-sm text-gray-500">Jump into the workflows you manage most.</p>
              <ul className="mt-4 space-y-3">
                {[
                  {
                    label: 'Add Parent Lead',
                    description: 'Capture a new family enquiry in seconds.',
                    onClick: () => navigate('/parent-lead-form'),
                    icon: UsersIcon,
                  },
                  {
                    label: 'Post Job Opening',
                    description: 'Publish opportunities for educators to apply.',
                    onClick: () => navigate('/recruitment'),
                    icon: BriefcaseIcon,
                  },
                  {
                    label: 'Order Supplies',
                    description: 'Request classroom materials from trusted partners.',
                    onClick: () => navigate('/marketplace'),
                    icon: ShoppingBagIcon,
                  },
                  {
                    label: 'Review Analytics',
                    description: 'Monitor enrolment and staffing performance.',
                    onClick: () => navigate('/analytics'),
                    icon: ChartBarIcon,
                  },
                ].map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <li key={action.label}>
                      <button
                        type="button"
                        onClick={action.onClick}
                        className="flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-swiss-mint/20 hover:bg-swiss-mint/5 focus:outline-none focus:ring-2 focus:ring-swiss-mint/40"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-swiss-mint/10 text-swiss-teal">
                          <ActionIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-swiss-charcoal">{action.label}</p>
                          <p className="text-xs text-gray-500">{action.description}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal">Quick Message</h2>
              <p className="mt-1 text-sm text-gray-500">Send a quick update to your foundation colleagues.</p>
              {teamRecipients.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  Add your colleagues to the foundation in order to message them directly.
                </div>
              ) : (
                <form className="mt-4 space-y-3" onSubmit={handleQuickMessage}>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="quick-message-recipient">
                    Recipient
                  </label>
                  <select
                    id="quick-message-recipient"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                    value={selectedRecipientId}
                    onChange={(event) => setSelectedRecipientId(event.target.value)}
                  >
                    {teamRecipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.label}
                      </option>
                    ))}
                  </select>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400" htmlFor="quick-message-body">
                    Message
                  </label>
                  <textarea
                    id="quick-message-body"
                    className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                    placeholder="Share an update with your team…"
                    value={quickMessage}
                    onChange={(event) => setQuickMessage(event.target.value)}
                  />
                  <Button type="submit" className="w-full" leftIcon={EnvelopeOpenIcon} disabled={quickMessageStatus === 'sending'}>
                    {quickMessageStatus === 'sending' ? 'Sending…' : 'Send Message'}
                  </Button>
                  {quickMessageStatus === 'sent' && (
                    <p className="text-center text-xs font-medium text-emerald-600">Message delivered to the selected teammate.</p>
                  )}
                  {quickMessageStatus === 'error' && (
                    <p className="text-center text-xs font-medium text-rose-600">Something went wrong. Please try again.</p>
                  )}
                </form>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal">Organisation Snapshot</h2>
              <p className="mt-1 text-sm text-gray-500">Key details from your organisation profile.</p>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-medium text-swiss-charcoal">Location</dt>
                  <dd>{organization?.canton || organization?.region || 'Not specified'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-medium text-swiss-charcoal">Languages</dt>
                  <dd>{organization?.languages?.length ? organization.languages.join(', ') : 'Not specified'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-medium text-swiss-charcoal">Capacity</dt>
                  <dd>{organization?.capacity ? `${organization.capacity} children` : 'Not specified'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-medium text-swiss-charcoal">Pedagogies</dt>
                  <dd>{organization?.pedagogy?.length ? organization.pedagogy.join(', ') : 'Not documented'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-medium text-swiss-charcoal">Lead Conversion</dt>
                  <dd>
                    {leadSummary.totalLeads === 0
                      ? 'No leads yet'
                      : `${leadSummary.convertedLeads} of ${leadSummary.totalLeads} converted`}
                  </dd>
                </div>
              </dl>
              <Button
                variant="light"
                className="mt-4 w-full"
                onClick={() => navigate('/organisation-profile')}
              >
                Manage organisation profile
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal">Marketplace Summary</h2>
              <p className="mt-1 text-sm text-gray-500">Current month spend across orders and service bookings.</p>
              <div className="mt-4 rounded-2xl bg-swiss-mint/10 p-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-swiss-teal">This month</p>
                <p className="mt-2 text-3xl font-bold text-swiss-charcoal">
                  {formatCurrency(monthlyOrderMetrics.totalSpend)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {monthlyOrderMetrics.ordersThisMonth} order{monthlyOrderMetrics.ordersThisMonth === 1 ? '' : 's'} processed
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-swiss-teal hover:text-swiss-mint"
                  onClick={() => navigate('/marketplace')}
                >
                  Open marketplace
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </>
    );
  };

  return (
    <DashboardLayout title="Dashboard" subtitle={`Welcome, ${firstName}!`}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default DashboardPage;
