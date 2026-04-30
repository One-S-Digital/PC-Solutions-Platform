import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient, apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Users,
  Package,
  Wrench,
  Home,
  ShoppingCart,
  Briefcase,
  Link,
} from 'lucide-react';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import ChipInput from '../components/design-system/ChipInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ALL_REGIONS_OPTION, STANDARD_INPUT_FIELD, SWISS_CANTONS_WITH_ALL, SWISS_CANTONS, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES } from '../constants/design-system';
import OrgProductsPanel from '../components/org/OrgProductsPanel';
import OrgServicesPanel from '../components/org/OrgServicesPanel';
import OrgMembersPanel from '../components/org/OrgMembersPanel';

interface OrganizationProfile {
  id: string;
  name: string;
  type: string;
  contactEmail: string;
  phoneNumber: string;
  contactPerson: string;
  region: string;
  canton: string;
  city: string;
  regionsServed: string[];
  description: string;
  vatNumber: string;
  languages: string[];
  websiteUrl: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  coverImageUrl: string | null;
  coverAssetId: string | null;
  // Foundation-specific
  capacity: number;
  pedagogy: string[];
  // Supplier-specific
  productCategory: string;
  minimumOrderQuantity: number;
  directOrderLink: string;
  catalogUrl: string;
  // Service Provider-specific
  serviceType: string;
  serviceCategories: string[];
  deliveryType: string;
  bookingLink: string;
  // Members
  members: Array<{
    userId: string;
    role: string;
    name: string;
    email: string;
  }>;
}

// Use the same pedagogy options as frontend for consistency
// These match the values defined in frontend/constants.ts PEDAGOGY_OPTIONS
const PEDAGOGY_OPTIONS = [
  'Montessori',
  'Reggio Emilia',
  'Waldorf',
  'Play-based',
  'Academic-focused',
  'Bilingual',
  'Nature-based',
  'Inclusive',
  'Other',
];

const LANGUAGE_OPTIONS = ['EN', 'FR', 'DE', 'IT'];

const AdminOrganizationProfileEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Fetch organization profile
  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['admin-organization-profile', id],
    queryFn: () => apiService.getAdminOrganizationProfile(apiClient, id!),
    enabled: !!id && !!apiClient,
  });

  const profile = profileResponse?.data?.data;

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        type: profile.type || '',
        contactEmail: profile.contactEmail || '',
        phoneNumber: profile.phoneNumber || '',
        contactPerson: profile.contactPerson || '',
        region: profile.region || '',
        canton: profile.canton || '',
        city: profile.city || '',
        regionsServed: profile.regionsServed || [],
        description: profile.description || '',
        vatNumber: profile.vatNumber || '',
        languages: profile.languages || [],
        // Backend canonical field is `websiteUrl` (older admin UIs used `website`)
        websiteUrl: profile.websiteUrl || (profile as any).website || '',
        capacity: profile.capacity || 0,
        pedagogy: profile.pedagogy || [],
        productCategory: profile.productCategory || '',
        minimumOrderQuantity: profile.minimumOrderQuantity ?? undefined,
        directOrderLink: profile.directOrderLink || '',
        catalogUrl: profile.catalogUrl || '',
        serviceType: profile.serviceType || '',
        serviceCategories: profile.serviceCategories || [],
        deliveryType: profile.deliveryType || '',
        bookingLink: profile.bookingLink || '',
      });
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<OrganizationProfile>) =>
      apiService.updateAdminOrganizationProfile(apiClient, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsDirty(false);
      toast.success(t('admin:orgProfile.updateSuccess', 'Organization profile updated successfully'));
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || t('admin:orgProfile.updateError', 'Failed to update organization profile');
      toast.error(message);
    },
  });

  const handleChange = (field: keyof OrganizationProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleMultiSelectChange = (field: keyof OrganizationProfile, value: string) => {
    const currentValues = (formData[field] as string[]) || [];
    let newValues: string[];
    if (field === 'regionsServed') {
      const hasAll = currentValues.includes(ALL_REGIONS_OPTION);
      const isAllValue = value === ALL_REGIONS_OPTION;

      if (isAllValue) {
        newValues = hasAll ? currentValues.filter((v) => v !== ALL_REGIONS_OPTION) : [ALL_REGIONS_OPTION];
      } else {
        const withoutAll = currentValues.filter((v) => v !== ALL_REGIONS_OPTION);
        newValues = withoutAll.includes(value)
          ? withoutAll.filter((v) => v !== value)
          : [...withoutAll, value];
      }
    } else if (currentValues.includes(value)) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    handleChange(field, newValues);
  };

  // Core submit logic - separated for reuse by both form submit and button click
  const submitForm = async () => {
    try {
      await updateMutation.mutateAsync(formData);
    } catch {
      // Error already handled by onError callback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  // Handler for Save button click (avoids MouseEvent/FormEvent type mismatch)
  const handleSaveClick = () => {
    submitForm();
  };

  const handleBack = () => {
    if (isDirty) {
      if (window.confirm(t('common:unsavedChangesPrompt', 'You have unsaved changes. Are you sure you want to leave?'))) {
        navigate('/organizations');
      }
    } else {
      navigate('/organizations');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{t('admin:orgProfile.loadError', 'Failed to load organization profile')}</div>
        <Button variant="secondary" onClick={() => navigate('/organizations')}>
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  const isFoundation = profile.type === 'FOUNDATION';
  const isSupplier = profile.type === 'PRODUCT_SUPPLIER';
  const isServiceProvider = profile.type === 'SERVICE_PROVIDER';

  const getTypeIcon = () => {
    switch (profile.type) {
      case 'FOUNDATION':
        return <Home className="h-6 w-6 text-swiss-teal" />;
      case 'SERVICE_PROVIDER':
        return <Wrench className="h-6 w-6 text-indigo-600" />;
      case 'PRODUCT_SUPPLIER':
        return <Package className="h-6 w-6 text-amber-600" />;
      default:
        return <Building2 className="h-6 w-6 text-swiss-teal" />;
    }
  };

  const getTypeLabel = () => {
    switch (profile.type) {
      case 'FOUNDATION':
        return t('admin:orgProfile.foundation', 'Foundation / Daycare');
      case 'SERVICE_PROVIDER':
        return t('admin:orgProfile.serviceProvider', 'Service Provider');
      case 'PRODUCT_SUPPLIER':
        return t('admin:orgProfile.supplier', 'Product Supplier');
      default:
        return profile.type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={handleBack}>
            {t('common:back', 'Back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-swiss-charcoal flex items-center">
              {getTypeIcon()}
              <span className="ml-2">{t('admin:orgProfile.editTitle', 'Edit Organization Profile')}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {profile.name} • <span className="text-swiss-teal">{getTypeLabel()}</span>
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={Save}
          onClick={handleSaveClick}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? t('common:saving', 'Saving...') : t('common:saveChanges', 'Save Changes')}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:orgProfile.basicInfo', 'Basic Information')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.name', 'Organization Name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                placeholder={t('admin:orgProfile.namePlaceholder', 'Enter organization name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.description', 'Description')}
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                maxLength={1000}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:orgProfile.descriptionPlaceholder', 'Describe the organization...')}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {(formData.description || '').length} / 1000
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.vatNumber', 'VAT Number')}
              </label>
              <input
                type="text"
                value={formData.vatNumber || ''}
                onChange={(e) => handleChange('vatNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="CHE-XXX.XXX.XXX"
              />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:orgProfile.contactInfo', 'Contact Information')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.contactEmail', 'Contact Email')}
              </label>
              <input
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.phone', 'Phone Number')}
              </label>
              <input
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.contactPerson', 'Contact Person')}
              </label>
              <input
                type="text"
                value={formData.contactPerson || ''}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:orgProfile.contactPersonPlaceholder', 'Name of contact person')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.website', 'Website')}
              </label>
              <input
                type="url"
                value={formData.websiteUrl || ''}
                onChange={(e) => handleChange('websiteUrl', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:orgProfile.location', 'Location')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.canton', 'Canton')}
                </label>
                <select
                  value={formData.canton || ''}
                  onChange={(e) => handleChange('canton', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value="">{t('admin:orgProfile.selectCanton', 'Select canton')}</option>
                  {SWISS_CANTONS.map((canton) => (
                    <option key={canton} value={canton}>
                      {canton}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.city', 'City')}
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:orgProfile.cityPlaceholder', 'Enter city')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:orgProfile.regionsServed', 'Regions Served')}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {t('admin:orgProfile.regionsServedHint', 'Select all cantons where this organization operates')}
              </p>
              <div className="flex flex-wrap gap-2">
                {SWISS_CANTONS_WITH_ALL.map((canton) => (
                  <button
                    key={canton}
                    type="button"
                    onClick={() => handleMultiSelectChange('regionsServed', canton)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                      (formData.regionsServed || []).includes(canton)
                        ? 'bg-swiss-teal text-white border-swiss-teal'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                    }`}
                  >
                    {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:orgProfile.languages', 'Languages Spoken')}
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleMultiSelectChange('languages', lang)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                      (formData.languages || []).includes(lang)
                        ? 'bg-swiss-teal text-white border-swiss-teal'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Foundation-specific fields */}
        {isFoundation && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.foundationInfo', 'Foundation Information')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.capacity', 'Capacity (Number of Children)')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity || ''}
                  onChange={(e) => handleChange('capacity', e.target.value ? parseInt(e.target.value, 10) : 0)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:orgProfile.pedagogy', 'Pedagogical Approaches')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PEDAGOGY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleMultiSelectChange('pedagogy', option)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                        (formData.pedagogy || []).includes(option)
                          ? 'bg-swiss-teal text-white border-swiss-teal'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Supplier-specific fields */}
        {isSupplier && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.supplierInfo', 'Supplier Information')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.productCategory', 'Product Category')}
                </label>
                <input
                  type="text"
                  value={formData.productCategory || ''}
                  onChange={(e) => handleChange('productCategory', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:orgProfile.productCategoryPlaceholder', 'e.g., Educational Toys, Furniture')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.minimumOrderQuantity', 'Minimum Order Quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.minimumOrderQuantity ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'minimumOrderQuantity',
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className={STANDARD_INPUT_FIELD}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.directOrderLink', 'Direct Order Link')}
                </label>
                <input
                  type="url"
                  value={formData.directOrderLink || ''}
                  onChange={(e) => handleChange('directOrderLink', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.catalogUrl', 'Catalog URL')}
                </label>
                <input
                  type="url"
                  value={formData.catalogUrl || ''}
                  onChange={(e) => handleChange('catalogUrl', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>
        )}

        {/* Service Provider-specific fields */}
        {isServiceProvider && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.serviceProviderInfo', 'Service Provider Information')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.serviceType', 'Service Type')}
                </label>
                <input
                  type="text"
                  value={formData.serviceType || ''}
                  onChange={(e) => handleChange('serviceType', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:orgProfile.serviceTypePlaceholder', 'e.g., IT Support, Cleaning')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:orgProfile.serviceCategories', 'Service Categories')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleMultiSelectChange('serviceCategories', category)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                        (formData.serviceCategories || []).includes(category)
                          ? 'bg-swiss-teal text-white border-swiss-teal'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                      }`}
                    >
                      {category.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.deliveryType', 'Delivery Type')}
                </label>
                <select
                  value={formData.deliveryType || ''}
                  onChange={(e) => handleChange('deliveryType', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value="">{t('admin:orgProfile.selectDeliveryType', 'Select delivery type')}</option>
                  {SERVICE_DELIVERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.bookingLink', 'Booking Link')}
                </label>
                <input
                  type="url"
                  value={formData.bookingLink || ''}
                  onChange={(e) => handleChange('bookingLink', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={handleBack}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            leftIcon={Save}
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? t('common:saving', 'Saving...') : t('common:saveChanges', 'Save Changes')}
          </Button>
        </div>
      </form>

      {/* Phase 5: Supplier products panel */}
      {isSupplier && <OrgProductsPanel orgId={id!} />}

      {/* Phase 6: Service provider services panel */}
      {isServiceProvider && <OrgServicesPanel orgId={id!} />}

      {/* Phase 7: Members management (replaces read-only member list) */}
      <OrgMembersPanel
        orgId={id!}
        orgType={profile.type}
        members={profile.members || []}
        onMembersChanged={() =>
          queryClient.invalidateQueries({ queryKey: ['admin-organization-profile', id] })
        }
      />
    </div>
  );
};

export default AdminOrganizationProfileEdit;
