import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FoundationDashboardLayout from '../../components/dashboard/FoundationDashboardLayout';
import { apiCall } from '../../utils/api';

type OrganizationMember = {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

type Organization = {
  id: string;
  name: string;
  canton?: string | null;
  languages?: string[] | null;
  capacity?: number | null;
  pedagogy?: string[] | null;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  bookingLink?: string | null;
  members?: OrganizationMember[];
};

type ProfileResponse = {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  organizations?: Array<{
    organization: Organization;
  }>;
};

type UpdatePayload = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  organizationName?: string;
  contactPerson?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  bookingLink?: string;
};

const FoundationOrganisationProfilePage: React.FC = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formValues, setFormValues] = useState<UpdatePayload>({});

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const response = await apiCall('/profiles/me', { headers });
      if (!response.ok) {
        throw new Error('Unable to load profile information');
      }
      const json = await response.json();
      const data: ProfileResponse = json.data ?? json;
      setProfile(data);
      const foundationLink = data.organizations?.find((link) => link.organization);
      if (foundationLink) {
        setOrganization(foundationLink.organization);
        setFormValues({
          firstName: data.firstName ?? undefined,
          lastName: data.lastName ?? undefined,
          phoneNumber: data.phoneNumber ?? undefined,
          organizationName: foundationLink.organization.name,
          contactPerson: foundationLink.organization.contactPerson ?? undefined,
          canton: foundationLink.organization.canton ?? undefined,
          languages: foundationLink.organization.languages ?? [],
          capacity: foundationLink.organization.capacity ?? undefined,
          pedagogy: foundationLink.organization.pedagogy ?? [],
          bookingLink: foundationLink.organization.bookingLink ?? undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdatePayload, value: string | number | string[]) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayInput = (field: keyof UpdatePayload, value: string) => {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    handleInputChange(field, items);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSuccess(null);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const response = await apiCall('/profiles/me', {
        method: 'PUT',
        headers,
        body: JSON.stringify(formValues),
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      setSuccess('Profile updated successfully');
      fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-swiss-mint/30 border-t-swiss-mint" />
            <p className="mt-3 text-sm text-gray-500">Loading organisation profile…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-semibold">We couldn’t load the organisation profile</h2>
          <p className="mt-2 text-sm">{error}</p>
          <Button className="mt-4" variant="light" onClick={fetchProfile}>
            Retry loading profile
          </Button>
        </Card>
      );
    }

    if (!organization) {
      return (
        <Card className="border border-amber-100 bg-amber-50 p-6 text-amber-700">
          <h2 className="text-lg font-semibold">Foundation organisation missing</h2>
          <p className="mt-2 text-sm">Link this account to a foundation organisation to configure its profile.</p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal">Organisation details</h2>
          <p className="mt-1 text-sm text-gray-500">Update information shared across your foundation dashboards and marketplace.</p>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-swiss-charcoal">
                Organisation name
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.organizationName ?? ''}
                  onChange={(event) => handleInputChange('organizationName', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Contact person
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.contactPerson ?? ''}
                  onChange={(event) => handleInputChange('contactPerson', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Canton / Region
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.canton ?? ''}
                  onChange={(event) => handleInputChange('canton', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Booking link
                <input
                  type="url"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.bookingLink ?? ''}
                  onChange={(event) => handleInputChange('bookingLink', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Languages (comma separated)
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={(formValues.languages ?? []).join(', ')}
                  onChange={(event) => handleArrayInput('languages', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Pedagogies (comma separated)
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={(formValues.pedagogy ?? []).join(', ')}
                  onChange={(event) => handleArrayInput('pedagogy', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Capacity
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.capacity ?? ''}
                  onChange={(event) => handleInputChange('capacity', Number(event.target.value))}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-swiss-charcoal">
                Director first name
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.firstName ?? ''}
                  onChange={(event) => handleInputChange('firstName', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Director last name
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.lastName ?? ''}
                  onChange={(event) => handleInputChange('lastName', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-swiss-charcoal">
                Contact phone number
                <input
                  type="tel"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                  value={formValues.phoneNumber ?? ''}
                  onChange={(event) => handleInputChange('phoneNumber', event.target.value)}
                />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                {success && <p className="text-sm font-semibold text-emerald-600">{success}</p>}
                {!success && <p className="text-xs text-gray-500">Changes will update across the foundation dashboard instantly.</p>}
              </div>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal">Team members</h2>
          <p className="mt-1 text-sm text-gray-500">Team members listed here can access the foundation dashboard and receive quick messages.</p>
          <ul className="mt-4 space-y-2">
            {organization.members?.length ? (
              organization.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
                  <span className="font-medium text-swiss-charcoal">
                    {`${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim() || member.user.email}
                  </span>
                  <span className="text-xs text-gray-500">{member.user.email}</span>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No team members linked yet.
              </li>
            )}
          </ul>
        </Card>
      </div>
    );
  };

  return (
    <FoundationDashboardLayout title="Organisation profile" subtitle="Keep your foundation details accurate and up to date">
      {renderContent()}
    </FoundationDashboardLayout>
  );
};

export default FoundationOrganisationProfilePage;
