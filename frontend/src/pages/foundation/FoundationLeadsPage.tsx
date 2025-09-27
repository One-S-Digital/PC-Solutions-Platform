import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { FunnelIcon, CheckCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { apiCall } from '../../utils/api';

type Lead = {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string | null;
  childName: string;
  childAge: number;
  status: string;
  preferredLocation?: string | null;
  preferredLanguages?: string[] | null;
  createdAt: string;
};

type ProfileResponse = {
  organizations?: Array<{
    organization: {
      id: string;
      type?: string;
      name: string;
    };
  }>;
};

type LeadStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'CONVERTED' | 'LOST' | string;

const statusOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: 'NEW', label: 'New enquiry' },
  { value: 'ASSIGNED', label: 'Assigned to team' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Closed - not pursuing' },
];

const statusBadgeStyles: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  ASSIGNED: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CONVERTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-rose-50 text-rose-700 border-rose-200',
};

const FoundationLeadsPage: React.FC = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [foundationId, setFoundationId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | LeadStatus>('all');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLeads = async () => {
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
        throw new Error('You are not linked to a foundation organisation yet.');
      }

      setFoundationId(foundationLink.organization.id);

      const leadsResponse = await apiCall(`/leads/parent-leads?foundationId=${foundationLink.organization.id}`, { headers });
      if (!leadsResponse.ok) {
        throw new Error('Failed to fetch leads from the server');
      }

      const leadsJson = await leadsResponse.json();
      setLeads((leadsJson.data ?? leadsJson) as Lead[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load leads at this time.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (activeFilter === 'all') {
      return leads;
    }
    return leads.filter((lead) => lead.status === activeFilter);
  }, [activeFilter, leads]);

  const summary = useMemo(() => {
    return leads.reduce(
      (acc, lead) => {
        const status = lead.status || 'NEW';
        acc.total += 1;
        acc.byStatus[status] = (acc.byStatus[status] ?? 0) + 1;
        if (status === 'NEW') acc.new += 1;
        if (status === 'ASSIGNED' || status === 'IN_PROGRESS') acc.active += 1;
        if (status === 'CONVERTED') acc.converted += 1;
        return acc;
      },
      { total: 0, new: 0, active: 0, converted: 0, byStatus: {} as Record<string, number> },
    );
  }, [leads]);

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      setUpdatingLeadId(leadId);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await apiCall(`/leads/parent-leads/${leadId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead status');
      }

      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not update the lead status.');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-swiss-mint/30 border-t-swiss-mint" />
            <p className="mt-3 text-sm text-gray-500">Loading parent leads…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-semibold">We couldn’t load the leads</h2>
          <p className="mt-2 text-sm">{error}</p>
          <Button className="mt-4" variant="light" onClick={fetchLeads}>
            Retry loading leads
          </Button>
        </Card>
      );
    }

    if (!foundationId) {
      return (
        <Card className="border border-amber-100 bg-amber-50 p-6 text-amber-700">
          <h2 className="text-lg font-semibold">Foundation organisation missing</h2>
          <p className="mt-2 text-sm">
            Link this account to a foundation organisation to start collecting and managing parent leads.
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total leads</p>
            <p className="mt-2 text-3xl font-bold text-swiss-charcoal">{summary.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">New today</p>
            <p className="mt-2 text-3xl font-bold text-swiss-charcoal">{summary.new}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active pipeline</p>
            <p className="mt-2 text-3xl font-bold text-swiss-charcoal">{summary.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Converted</p>
            <p className="mt-2 text-3xl font-bold text-swiss-charcoal">{summary.converted}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-swiss-charcoal">Lead pipeline</h2>
              <p className="text-sm text-gray-500">Monitor family enquiries and track their progress through onboarding.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeFilter === 'all' ? 'primary' : 'light'}
                size="sm"
                onClick={() => setActiveFilter('all')}
              >
                All leads
              </Button>
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={activeFilter === option.value ? 'primary' : 'light'}
                  size="sm"
                  onClick={() => setActiveFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Family</th>
                  <th className="py-3 pr-4">Child</th>
                  <th className="py-3 pr-4">Preferences</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                      No leads found for this filter.
                    </td>
                  </tr>
                )}
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-swiss-mint/5">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-swiss-charcoal">{lead.parentName}</p>
                      <p className="text-xs text-gray-500">{lead.parentEmail}</p>
                      {lead.parentPhone && <p className="text-xs text-gray-500">{lead.parentPhone}</p>}
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-swiss-charcoal">{lead.childName}</p>
                      <p className="text-xs text-gray-500">{lead.childAge} years old</p>
                    </td>
                    <td className="py-4 pr-4 text-xs text-gray-500">
                      <div className="space-y-1">
                        {lead.preferredLocation && <p>Location: {lead.preferredLocation}</p>}
                        {lead.preferredLanguages?.length ? <p>Languages: {lead.preferredLanguages.join(', ')}</p> : null}
                        <p>Received: {new Date(lead.createdAt).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                          statusBadgeStyles[lead.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {lead.status === 'CONVERTED' ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : lead.status === 'NEW' ? (
                          <ClockIcon className="h-4 w-4" />
                        ) : lead.status === 'LOST' ? (
                          <XMarkIcon className="h-4 w-4" />
                        ) : (
                          <FunnelIcon className="h-4 w-4" />
                        )}
                        {statusOptions.find((option) => option.value === lead.status)?.label ?? lead.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <select
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                        value={lead.status}
                        onChange={(event) => updateLeadStatus(lead.id, event.target.value as LeadStatus)}
                        disabled={updatingLeadId === lead.id}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout title="Participant Leads" subtitle="Manage family enquiries and track conversions">
      {renderContent()}
    </DashboardLayout>
  );
};

export default FoundationLeadsPage;
