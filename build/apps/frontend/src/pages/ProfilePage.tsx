import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { SwissCard, SwissButton, Input, Badge } from '@repo/ui';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
  organization?: {
    id: string;
    name: string;
    type: string;
    contactPerson?: string;
    phoneNumber?: string;
    canton?: string;
    languages?: string[];
    capacity?: number;
    pedagogy?: string[];
    productCategory?: string;
    serviceType?: string;
    minimumOrderQuantity?: number;
    directOrderLink?: string;
    catalogUrl?: string;
    serviceCategories?: string[];
    deliveryType?: string;
    bookingLink?: string;
  };
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      const response = await fetch('/api/profiles/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      setProfileData(result.data);
      setFormData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const token = await getToken();
      
      const response = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      setProfileData(result.data);
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderRoleSpecificFields = () => {
    if (!profileData) return null;

    switch (profileData.role) {
      case 'EDUCATOR':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Work Experience
              </label>
              <textarea
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                rows={4}
                value={formData.workExperience || ''}
                onChange={(e) => updateFormData('workExperience', e.target.value)}
                placeholder="Describe your work experience..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Education
              </label>
              <textarea
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                rows={3}
                value={formData.education || ''}
                onChange={(e) => updateFormData('education', e.target.value)}
                placeholder="Your educational background..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Skills
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.skills?.join(', ') || ''}
                onChange={(e) => updateFormData('skills', e.target.value.split(', ').filter(s => s.trim()))}
                placeholder="Enter skills separated by commas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Availability
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.availability || ''}
                onChange={(e) => updateFormData('availability', e.target.value)}
                placeholder="e.g., Monday-Friday, 8AM-5PM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                CV URL
              </label>
              <input
                type="url"
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.cvUrl || ''}
                onChange={(e) => updateFormData('cvUrl', e.target.value)}
                placeholder="https://example.com/cv.pdf"
              />
            </div>
          </div>
        );

      case 'FOUNDATION':
      case 'PRODUCT_SUPPLIER':
      case 'SERVICE_PROVIDER':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Organization Name
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.organizationName || profileData.organization?.name || ''}
                onChange={(e) => updateFormData('organizationName', e.target.value)}
                placeholder="Your organization name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Contact Person
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.contactPerson || profileData.organization?.contactPerson || ''}
                onChange={(e) => updateFormData('contactPerson', e.target.value)}
                placeholder="Contact person name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Canton
              </label>
              <select
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.canton || profileData.organization?.canton || ''}
                onChange={(e) => updateFormData('canton', e.target.value)}
              >
                <option value="">Select Canton</option>
                <option value="ZH">Zurich</option>
                <option value="BE">Bern</option>
                <option value="LU">Lucerne</option>
                <option value="UR">Uri</option>
                <option value="SZ">Schwyz</option>
                <option value="OW">Obwalden</option>
                <option value="NW">Nidwalden</option>
                <option value="GL">Glarus</option>
                <option value="ZG">Zug</option>
                <option value="FR">Fribourg</option>
                <option value="SO">Solothurn</option>
                <option value="BS">Basel-Stadt</option>
                <option value="BL">Basel-Landschaft</option>
                <option value="SH">Schaffhausen</option>
                <option value="AR">Appenzell Ausserrhoden</option>
                <option value="AI">Appenzell Innerrhoden</option>
                <option value="SG">St. Gallen</option>
                <option value="GR">Graubünden</option>
                <option value="AG">Aargau</option>
                <option value="TG">Thurgau</option>
                <option value="TI">Ticino</option>
                <option value="VD">Vaud</option>
                <option value="VS">Valais</option>
                <option value="NE">Neuchâtel</option>
                <option value="GE">Geneva</option>
                <option value="JU">Jura</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Languages
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={formData.languages?.join(', ') || profileData.organization?.languages?.join(', ') || ''}
                onChange={(e) => updateFormData('languages', e.target.value.split(', ').filter(s => s.trim()))}
                placeholder="German, French, Italian, English"
              />
            </div>

            {profileData.role === 'FOUNDATION' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Capacity (Number of Children)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.capacity || profileData.organization?.capacity || ''}
                    onChange={(e) => updateFormData('capacity', parseInt(e.target.value) || null)}
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Pedagogy Approaches
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.pedagogy?.join(', ') || profileData.organization?.pedagogy?.join(', ') || ''}
                    onChange={(e) => updateFormData('pedagogy', e.target.value.split(', ').filter(s => s.trim()))}
                    placeholder="Montessori, Reggio Emilia, Forest School"
                  />
                </div>
              </>
            )}

            {profileData.role === 'PRODUCT_SUPPLIER' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Product Category
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.productCategory || profileData.organization?.productCategory || ''}
                    onChange={(e) => updateFormData('productCategory', e.target.value)}
                    placeholder="Educational Toys, Furniture, Books"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Minimum Order Quantity
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.minimumOrderQuantity || profileData.organization?.minimumOrderQuantity || ''}
                    onChange={(e) => updateFormData('minimumOrderQuantity', parseInt(e.target.value) || null)}
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Direct Order Link
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.directOrderLink || profileData.organization?.directOrderLink || ''}
                    onChange={(e) => updateFormData('directOrderLink', e.target.value)}
                    placeholder="https://example.com/order"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Catalog URL
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.catalogUrl || profileData.organization?.catalogUrl || ''}
                    onChange={(e) => updateFormData('catalogUrl', e.target.value)}
                    placeholder="https://example.com/catalog"
                  />
                </div>
              </>
            )}

            {profileData.role === 'SERVICE_PROVIDER' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Service Type
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.serviceType || profileData.organization?.serviceType || ''}
                    onChange={(e) => updateFormData('serviceType', e.target.value)}
                    placeholder="Cleaning, Maintenance, Catering"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Service Categories
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.serviceCategories?.join(', ') || profileData.organization?.serviceCategories?.join(', ') || ''}
                    onChange={(e) => updateFormData('serviceCategories', e.target.value.split(', ').filter(s => s.trim()))}
                    placeholder="Cleaning, Maintenance, Security"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Delivery Type
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.deliveryType || profileData.organization?.deliveryType || ''}
                    onChange={(e) => updateFormData('deliveryType', e.target.value)}
                  >
                    <option value="">Select Delivery Type</option>
                    <option value="ON_SITE">On-site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Booking Link
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.bookingLink || profileData.organization?.bookingLink || ''}
                    onChange={(e) => updateFormData('bookingLink', e.target.value)}
                    placeholder="https://example.com/booking"
                  />
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <SwissCard className="p-6 max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Error</h2>
            <p className="text-text-muted mb-4">{error}</p>
            <SwissButton variant="primary" onClick={fetchProfile}>
              Try Again
            </SwissButton>
          </div>
        </SwissCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-strong">Profile Management</h1>
          <p className="text-text-muted mt-2">Manage your personal and professional information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <SwissCard variant="accent" className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-accent-contrast">
                    {profileData?.firstName?.[0]}{profileData?.lastName?.[0]}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-text-strong">
                  {profileData?.firstName} {profileData?.lastName}
                </h2>
                <p className="text-text-muted">{profileData?.email}</p>
                <Badge variant="info" className="mt-2">
                  {profileData?.role}
                </Badge>
              </div>
            </SwissCard>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <SwissCard className="p-6">
              <h3 className="text-lg font-semibold text-text-strong mb-6">Profile Information</h3>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName || ''}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName || ''}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                  />
                </div>

                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                />

                {/* Role-specific fields */}
                {renderRoleSpecificFields()}

                {/* Error message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end">
                  <SwissButton
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </SwissButton>
                </div>
              </div>
            </SwissCard>
          </div>
        </div>
      </div>
    </div>
  );
}