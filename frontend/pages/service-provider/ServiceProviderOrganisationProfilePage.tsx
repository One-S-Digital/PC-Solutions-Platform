import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
  UserCircleIcon,
  BriefcaseIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAppContext } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import ProfileDocumentsSettings from '../../components/settings/sections/ProfileDocumentsSettings';
import { UserRole } from '../../types';

interface ServiceProviderSettingsData {
  companyName?: string;
  contactEmail?: string;
  phoneNumber?: string;
  contactPerson?: string;
  address?: string;
  canton?: string;
  regionsServed?: string[];
  languages?: string[];
  description?: string;
  vatNumber?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  serviceType?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
}

interface OrganizationDetails {
  id?: string;
  name?: string;
  type?: string;
  region?: string | null;
  description?: string | null;
  vatNumber?: string | null;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  canton?: string | null;
  languages?: string[];
  regionsServed?: string[];
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  serviceType?: string | null;
  serviceCategories?: string[];
  deliveryType?: string | null;
  bookingLink?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

interface ProfileResponse {
  organizations?: Array<
    | {
        organization?: OrganizationDetails | null;
        [key: string]: unknown;
      }
    | OrganizationDetails
  >;
  [key: string]: unknown;
}

type InfoItemProps = {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
};

const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-swiss-teal mt-0.5" />
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <div className="text-sm text-swiss-charcoal break-words">{value}</div>
    </div>
  </div>
);

const ServiceProviderOrganisationProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'profile', 'settings']);
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [serviceProviderSettings, setServiceProviderSettings] = useState<ServiceProviderSettingsData | null>(null);
  const [organizationDetails, setOrganizationDetails] = useState<OrganizationDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const notProvidedLabel = t('foundationOrganisationProfilePage.notProvided', 'Not provided');

  const formatDate = (value?: string | null) => {
    if (!value) {
      return notProvidedLabel;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(i18n.language || 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parsed);
  };

  const renderTagList = (items?: string[], emptyMessage?: string) => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-gray-500">{emptyMessage ?? notProvidedLabel}</p>;
    }
    const uniqueItems = Array.from(
      new Set(
        items
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean),
      ),
    );

    if (uniqueItems.length === 0) {
      return <p className="text-sm text-gray-500">{emptyMessage ?? notProvidedLabel}</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {uniqueItems.map((item, index) => (
          <span
            key={`${index}-${item}`}
            className="inline-flex items-center rounded-full bg-swiss-mint/10 px-2.5 py-1 text-xs font-medium text-swiss-mint"
          >
            {item.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser.role !== UserRole.SERVICE_PROVIDER) {
      setServiceProviderSettings(null);
      setOrganizationDetails(null);
      setError(t('organizationProfileForm.accessDenied', 'Access denied.'));
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [serviceProviderRes, profileRes] = await Promise.all([
          request<ServiceProviderSettingsData>('/settings/service-provider'),
          request<ProfileResponse>('/profiles/me'),
        ]);

        if (!serviceProviderRes.success || !serviceProviderRes.data) {
          throw new Error(serviceProviderRes.message || 'Failed to load service provider settings');
        }

        if (isCancelled) {
          return;
        }

        const data = serviceProviderRes.data;
        setServiceProviderSettings({
          companyName: data.companyName || currentUser.orgName || '',
          contactEmail: data.contactEmail || currentUser.email || '',
          phoneNumber: data.phoneNumber || '',
          contactPerson: data.contactPerson || '',
          address: data.address || '',
          canton: data.canton || '',
          regionsServed: Array.isArray(data.regionsServed) ? data.regionsServed.filter(Boolean) : [],
          languages: Array.isArray(data.languages) ? data.languages.filter(Boolean) : [],
          description: data.description || '',
          vatNumber: data.vatNumber || '',
          logoUrl: data.logoUrl || '',
          coverImageUrl: data.coverImageUrl || '',
          serviceType: data.serviceType || '',
          serviceCategories: Array.isArray(data.serviceCategories) ? data.serviceCategories.filter(Boolean) : [],
          deliveryType: data.deliveryType || '',
          bookingLink: data.bookingLink || '',
        });

        let resolvedOrganization: OrganizationDetails | null = null;

        if (profileRes.success && profileRes.data && Array.isArray(profileRes.data.organizations)) {
          for (const entry of profileRes.data.organizations) {
            const organizationCandidate =
              (entry as { organization?: OrganizationDetails | null })?.organization ?? (entry as OrganizationDetails);
            if (organizationCandidate) {
              resolvedOrganization = {
                ...organizationCandidate,
                languages: Array.isArray(organizationCandidate.languages)
                  ? organizationCandidate.languages.filter(Boolean)
                  : undefined,
                regionsServed: Array.isArray(organizationCandidate.regionsServed)
                  ? organizationCandidate.regionsServed.filter(Boolean)
                  : undefined,
                serviceCategories: Array.isArray(organizationCandidate.serviceCategories)
                  ? organizationCandidate.serviceCategories.filter(Boolean)
                  : undefined,
              };
              break;
            }
          }
        }

        if (!isCancelled) {
          setOrganizationDetails(resolvedOrganization);
        }
      } catch (fetchError) {
        if (isCancelled) {
          return;
        }
        const fallbackMessage = t(
          'serviceProviderOrganisationProfilePage.loadError',
          'Unable to load organization profile details. Please try again.',
        );
        console.error('Failed to load service provider organization profile', fetchError);
        setError(fallbackMessage);
        addNotification({
          title: t('common:notifications.errorTitle', 'Error'),
          message: fallbackMessage,
          type: 'error',
        });
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, [addNotification, currentUser, reloadKey, request, t]);

  const handleRetry = () => {
    setReloadKey(prev => prev + 1);
  };

  const organizationName =
    serviceProviderSettings?.companyName?.trim() ||
    organizationDetails?.name?.trim() ||
    currentUser?.orgName ||
    t('serviceProviderOrganisationProfilePage.empty.organizationName', 'Organization name not set');

  const contactEmail = serviceProviderSettings?.contactEmail || currentUser?.email || notProvidedLabel;
  const phoneNumber = serviceProviderSettings?.phoneNumber || organizationDetails?.phoneNumber || notProvidedLabel;
  const contactPerson = serviceProviderSettings?.contactPerson || organizationDetails?.contactPerson || notProvidedLabel;
  const addressLine = serviceProviderSettings?.address || organizationDetails?.region || '';
  const cantonValue = serviceProviderSettings?.canton || organizationDetails?.canton || '';
  const regionsServed = serviceProviderSettings?.regionsServed?.length
    ? serviceProviderSettings.regionsServed
    : organizationDetails?.regionsServed ?? [];
  const languages = serviceProviderSettings?.languages?.length
    ? serviceProviderSettings.languages
    : organizationDetails?.languages ?? [];
  const serviceType = serviceProviderSettings?.serviceType || organizationDetails?.serviceType || notProvidedLabel;
  const serviceCategories = serviceProviderSettings?.serviceCategories?.length
    ? serviceProviderSettings.serviceCategories
    : organizationDetails?.serviceCategories ?? [];
  const deliveryType = serviceProviderSettings?.deliveryType || organizationDetails?.deliveryType || notProvidedLabel;
  const statusLabel =
    organizationDetails?.isActive === false
      ? t('common:status.inactive', 'Inactive')
      : t('common:status.active', 'Active');
  const organizationId = organizationDetails?.id || currentUser?.orgId || '';
  const vatNumber = serviceProviderSettings?.vatNumber || organizationDetails?.vatNumber || notProvidedLabel;
  const bookingLink = serviceProviderSettings?.bookingLink || organizationDetails?.bookingLink || '';

  const logoUrl = serviceProviderSettings?.logoUrl || organizationDetails?.logoUrl || currentUser?.orgLogoUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(organizationName)}&background=2DD4BF&color=ffffff&size=128&rounded=true`;
  
  const coverImageUrl = serviceProviderSettings?.coverImageUrl || organizationDetails?.coverImageUrl || currentUser?.orgCoverImageUrl ||
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80';

  const pageTitle = t('serviceProviderOrganisationProfilePage.title', 'Organization Profile');
  const pageSubtitle = t(
    'serviceProviderOrganisationProfilePage.subtitle',
    'View and manage your company profile information.',
  );

  const locationValue =
    addressLine || cantonValue ? (
      <div className="space-y-1">
        <span>{addressLine || notProvidedLabel}</span>
        {cantonValue && <span className="block text-xs text-gray-500">{cantonValue}</span>}
      </div>
    ) : (
      notProvidedLabel
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <BuildingOfficeIcon className="h-8 w-8 text-swiss-mint" />
          <div>
            <h1 className="text-3xl font-bold text-swiss-charcoal">{pageTitle}</h1>
            <p className="text-sm text-gray-500">{pageSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="light"
            size="sm"
            leftIcon={ArrowPathIcon}
            onClick={handleRetry}
            disabled={isLoading}
            aria-label={t('common:buttons.retry', 'Retry')}
          >
            {t('common:buttons.retry', 'Retry')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Cog6ToothIcon}
            onClick={() => navigate('/settings/profile')}
            aria-label={t('profile:actions.goToSettings', 'Edit Profile')}
          >
            {t('profile:actions.editProfile', 'Edit Profile')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <LoadingSpinner text={t('common:loading', 'Loading...')} />
        </Card>
      ) : error ? (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <InformationCircleIcon className="h-10 w-10 text-swiss-coral" />
            <p className="text-sm text-gray-600">{error}</p>
            <Button variant="primary" size="sm" leftIcon={ArrowPathIcon} onClick={handleRetry}>
              {t('common:buttons.retry', 'Retry')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Cover Image and Logo Section */}
          <Card className="overflow-hidden">
            <div 
              className="h-48 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            />
            <div className="relative px-6 pb-6">
              <div className="flex items-end -mt-16 mb-4">
                <img
                  src={logoUrl}
                  alt={organizationName}
                  className="w-32 h-32 rounded-lg border-4 border-white shadow-lg object-cover bg-white"
                />
                <div className="ml-4 mb-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-swiss-charcoal">{organizationName}</h2>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        organizationDetails?.isActive === false
                          ? 'bg-red-100 text-red-700'
                          : 'bg-swiss-mint/10 text-swiss-mint'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('settings:companyProfile.serviceProvider', 'Service Provider')}
                  </p>
                </div>
              </div>
              
              {serviceProviderSettings?.description && (
                <p className="text-sm leading-relaxed text-gray-600 mt-4">{serviceProviderSettings.description}</p>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('settings:companyProfile.serviceType', 'Service Type')}
              </p>
              <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-swiss-charcoal">
                <BriefcaseIcon className="h-5 w-5 text-swiss-mint" />
                {serviceType}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('settings:companyProfile.deliveryType', 'Delivery Type')}
              </p>
              <div className="mt-2 text-lg font-semibold text-swiss-charcoal">
                {deliveryType}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('serviceProviderOrganisationProfilePage.labels.serviceCategories', 'Service Categories')}
              </p>
              <div className="mt-2 text-sm text-swiss-charcoal">
                {serviceCategories.length ? serviceCategories.length : notProvidedLabel}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('foundationOrganisationProfilePage.labels.updatedAt', 'Last updated')}
              </p>
              <div className="mt-2 text-sm text-swiss-charcoal">
                {formatDate(organizationDetails?.updatedAt)}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contact & Location */}
            <Card className="p-6 space-y-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-swiss-charcoal">
                <EnvelopeIcon className="h-5 w-5 text-swiss-mint" />
                {t('foundationOrganisationProfilePage.sections.contact.title', 'Contact & Location')}
              </h3>
              <div className="space-y-4">
                <InfoItem
                  icon={EnvelopeIcon}
                  label={t('foundationOrganisationProfilePage.labels.contactEmail', 'Primary email')}
                  value={contactEmail}
                />
                <InfoItem
                  icon={PhoneIcon}
                  label={t('foundationOrganisationProfilePage.labels.phoneNumber', 'Phone number')}
                  value={phoneNumber}
                />
                <InfoItem
                  icon={UserCircleIcon}
                  label={t('foundationOrganisationProfilePage.labels.contactPerson', 'Contact person')}
                  value={contactPerson}
                />
                <InfoItem
                  icon={MapPinIcon}
                  label={t('foundationOrganisationProfilePage.labels.address', 'Location')}
                  value={locationValue}
                />
              </div>
            </Card>

            {/* Service Details */}
            <Card className="p-6 space-y-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-swiss-charcoal">
                <BriefcaseIcon className="h-5 w-5 text-swiss-mint" />
                {t('settings:companyProfile.serviceProviderInfo', 'Service Provider Information')}
              </h3>
              <div className="space-y-4">
                <InfoItem
                  icon={BriefcaseIcon}
                  label={t('settings:companyProfile.serviceCategories', 'Service Categories')}
                  value={renderTagList(
                    serviceCategories,
                    t('serviceProviderOrganisationProfilePage.empty.serviceCategories', 'No categories specified.'),
                  )}
                />
                <InfoItem
                  icon={GlobeAltIcon}
                  label={t('serviceProviderOrganisationProfilePage.labels.regionsServed', 'Regions Served')}
                  value={renderTagList(
                    regionsServed,
                    t('serviceProviderOrganisationProfilePage.empty.regionsServed', 'No regions specified.'),
                  )}
                />
                <InfoItem
                  icon={GlobeAltIcon}
                  label={t('foundationOrganisationProfilePage.labels.languages', 'Languages')}
                  value={renderTagList(
                    languages,
                    t('foundationOrganisationProfilePage.empty.languages', 'No languages added yet.'),
                  )}
                />
              </div>
            </Card>
          </div>

          {/* Organization Metadata */}
          <Card className="p-6 space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-swiss-charcoal">
              <InformationCircleIcon className="h-5 w-5 text-swiss-mint" />
              {t('foundationOrganisationProfilePage.sections.metadata.title', 'Organization metadata')}
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.organizationId', 'Organization ID')}
                </dt>
                <dd className="mt-1 break-all font-mono text-sm text-swiss-charcoal">
                  {organizationId || notProvidedLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.vatNumber', 'VAT number')}
                </dt>
                <dd className="mt-1 text-sm text-swiss-charcoal">{vatNumber}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.createdAt', 'Created')}
                </dt>
                <dd className="mt-1 text-sm text-swiss-charcoal">{formatDate(organizationDetails?.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.updatedAt', 'Last updated')}
                </dt>
                <dd className="mt-1 text-sm text-swiss-charcoal">{formatDate(organizationDetails?.updatedAt)}</dd>
              </div>
            </dl>

            {bookingLink && (
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={LinkIcon}
                  onClick={() => window.open(bookingLink, '_blank', 'noopener,noreferrer')}
                >
                  {t('serviceProviderOrganisationProfilePage.actions.openBookingLink', 'Open Booking Link')}
                </Button>
              </div>
            )}
          </Card>

          {/* Documents Section */}
          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-swiss-charcoal mb-4">
              <DocumentIcon className="h-5 w-5 text-swiss-mint" />
              {t('settings:profileDocuments.title', 'Catalogs & Documents')}
            </h3>
            <ProfileDocumentsSettings userRole={UserRole.SERVICE_PROVIDER} />
          </Card>
        </>
      )}
    </div>
  );
};

export default ServiceProviderOrganisationProfilePage;
