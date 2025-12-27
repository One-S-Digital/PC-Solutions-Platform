
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  IdentificationIcon,
  InformationCircleIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAppContext } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import OrganizationProfileForm from '../../components/settings/OrganizationProfileForm';
import { UserRole } from '../../types';

interface FoundationSettingsData {
  companyName?: string;
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
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
  capacity?: number | null;
  pedagogy?: string[];
  bookingLink?: string | null;
  directOrderLink?: string | null;
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

// Helper to get translation key for pedagogy values
const PEDAGOGY_KEY_MAP: Record<string, string> = {
  'Montessori': 'montessori',
  'Reggio Emilia': 'reggioEmilia',
  'Waldorf': 'waldorf',
  'Play-based': 'playBased',
  'Academic-focused': 'academicFocused',
  'Bilingual': 'bilingual',
  'Nature-based': 'natureBased',
  'Inclusive': 'inclusive',
  'Other': 'other',
};

const FoundationOrganisationProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'profile', 'settings']);
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [foundationSettings, setFoundationSettings] = useState<FoundationSettingsData | null>(null);
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

  const renderTagList = (items?: string[], emptyMessage?: string, translationPrefix?: string) => {
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
        {uniqueItems.map(item => {
          // If a translation prefix is provided, try to translate the item
          let displayText = item;
          if (translationPrefix) {
            const translationKey = PEDAGOGY_KEY_MAP[item];
            if (translationKey) {
              displayText = t(`${translationPrefix}.${translationKey}`, item);
            }
          }
          return (
            <span
              key={item.toLowerCase()}
              className="inline-flex items-center rounded-full bg-swiss-mint/10 px-2.5 py-1 text-xs font-medium text-swiss-mint"
            >
              {displayText}
            </span>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser.role !== UserRole.FOUNDATION) {
      setFoundationSettings(null);
      setOrganizationDetails(null);
      setError(t('common:organizationProfileForm.accessDenied', 'Access denied.'));
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [foundationRes, profileRes] = await Promise.all([
          request<FoundationSettingsData>('/settings/foundation'),
          request<ProfileResponse>('/profiles/me'),
        ]);

        if (!foundationRes.success || !foundationRes.data) {
          throw new Error(foundationRes.message || 'Failed to load foundation settings');
        }

        if (isCancelled) {
          return;
        }

        const data = foundationRes.data;
        setFoundationSettings({
          companyName: data.companyName || currentUser.orgName || '',
          contactEmail: data.contactEmail || currentUser.email || '',
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          canton: data.canton || '',
          languages: Array.isArray(data.languages) ? data.languages.filter(Boolean) : [],
          capacity: typeof data.capacity === 'number' ? data.capacity : undefined,
          pedagogy: Array.isArray(data.pedagogy) ? data.pedagogy.filter(Boolean) : [],
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
                pedagogy: Array.isArray(organizationCandidate.pedagogy)
                  ? organizationCandidate.pedagogy.filter(Boolean)
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
          'foundationOrganisationProfilePage.loadError',
          'Unable to load organization profile details. Please try again.',
        );
        console.error('Failed to load foundation organization profile', fetchError);
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
    foundationSettings?.companyName?.trim() ||
    organizationDetails?.name?.trim() ||
    currentUser?.orgName ||
    t('foundationOrganisationProfilePage.empty.organizationName', 'Organization name not set');

  const organizationTypeLabel = organizationDetails?.type
    ? organizationDetails.type
        .toString()
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : t('foundationOrganisationProfilePage.empty.organizationType', 'Organization type not specified');

  const contactEmail = foundationSettings?.contactEmail || currentUser?.email || notProvidedLabel;
  const phoneNumber = foundationSettings?.phoneNumber || organizationDetails?.phoneNumber || notProvidedLabel;
  const contactPerson = organizationDetails?.contactPerson || notProvidedLabel;
  const addressLine = foundationSettings?.address || organizationDetails?.region || '';
  const cantonValue = foundationSettings?.canton || organizationDetails?.canton || '';
  const languages = foundationSettings?.languages?.length
    ? foundationSettings.languages
    : organizationDetails?.languages ?? [];
  const pedagogy = foundationSettings?.pedagogy?.length
    ? foundationSettings.pedagogy
    : organizationDetails?.pedagogy ?? [];
  const capacityValue =
    foundationSettings?.capacity && foundationSettings.capacity > 0
      ? foundationSettings.capacity.toString()
      : organizationDetails?.capacity && organizationDetails.capacity > 0
      ? organizationDetails.capacity.toString()
      : notProvidedLabel;
  const statusLabel =
    organizationDetails?.isActive === false
      ? t('common:status.inactive', 'Inactive')
      : t('common:status.active', 'Active');
  const organizationId = organizationDetails?.id || currentUser?.orgId || '';
  const vatNumber = organizationDetails?.vatNumber || notProvidedLabel;
  const bookingLink = organizationDetails?.bookingLink || '';
  const directOrderLink = organizationDetails?.directOrderLink || '';

  const pageTitle = t('foundationOrganisationProfilePage.title', 'Organization Profile');
  const pageSubtitle = t(
    'foundationOrganisationProfilePage.subtitle',
    'Review your organization profile details pulled directly from the database.',
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
            onClick={() => navigate('/settings')}
            aria-label={t('profile:actions.goToSettings', 'Update Profile')}
          >
            {t('profile:actions.goToSettings', 'Update Profile')}
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
          <Card className="p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-swiss-charcoal">{organizationName}</h2>
                <p className="text-sm text-gray-500">{organizationTypeLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    organizationDetails?.isActive === false
                      ? 'bg-red-100 text-red-700'
                      : 'bg-swiss-mint/10 text-swiss-mint'
                  }`}
                >
                  {statusLabel}
                </span>
                {organizationId && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    <IdentificationIcon className="h-4 w-4" />
                    <span className="font-mono">{organizationId}</span>
                  </span>
                )}
              </div>
            </div>

            {organizationDetails?.description && (
              <p className="text-sm leading-relaxed text-gray-600">{organizationDetails.description}</p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('common:organizationProfileForm.labels.capacity', 'Capacity')}
                </p>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-swiss-charcoal">
                  <UserGroupIcon className="h-5 w-5 text-swiss-mint" />
                  {capacityValue}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.languages', 'Languages')}
                </p>
                <div className="mt-2 text-sm text-swiss-charcoal">
                  {languages.length ? languages.join(', ') : notProvidedLabel}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.pedagogy', 'Pedagogy')}
                </p>
                <div className="mt-2 text-sm text-swiss-charcoal">
                  {pedagogy.length ? pedagogy.length : notProvidedLabel}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('foundationOrganisationProfilePage.labels.updatedAt', 'Last updated')}
                </p>
                <div className="mt-2 text-sm text-swiss-charcoal">
                  {formatDate(organizationDetails?.updatedAt)}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

            <Card className="p-6 space-y-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-swiss-charcoal">
                <AcademicCapIcon className="h-5 w-5 text-swiss-mint" />
                {t('foundationOrganisationProfilePage.sections.operations.title', 'Operations')}
              </h3>
              <div className="space-y-4">
                <InfoItem
                  icon={UserGroupIcon}
                  label={t('common:organizationProfileForm.labels.capacity', 'Capacity')}
                  value={capacityValue}
                />
                <InfoItem
                  icon={GlobeAltIcon}
                  label={t('foundationOrganisationProfilePage.labels.languages', 'Languages')}
                  value={renderTagList(
                    languages,
                    t('foundationOrganisationProfilePage.empty.languages', 'No languages added yet.'),
                  )}
                />
                <InfoItem
                  icon={AcademicCapIcon}
                  label={t('foundationOrganisationProfilePage.labels.pedagogy', 'Pedagogy')}
                  value={renderTagList(
                    pedagogy,
                    t('foundationOrganisationProfilePage.empty.pedagogy', 'No pedagogy styles recorded.'),
                    'settings:companyProfile.pedagogyOptions',
                  )}
                />
              </div>
            </Card>
          </div>

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

            {(bookingLink || directOrderLink) && (
              <div className="flex flex-wrap gap-3 pt-2">
                {bookingLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={LinkIcon}
                    onClick={() => window.open(bookingLink, '_blank', 'noopener,noreferrer')}
                  >
                    {t('foundationOrganisationProfilePage.actions.openBookingLink', 'Open booking link')}
                  </Button>
                )}
                {directOrderLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={LinkIcon}
                    onClick={() => window.open(directOrderLink, '_blank', 'noopener,noreferrer')}
                  >
                    {t('foundationOrganisationProfilePage.actions.openDirectOrderLink', 'Open direct order link')}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-swiss-charcoal">
              {t(
                'foundationOrganisationProfilePage.sections.edit.title',
                'Update core organization profile information',
              )}
            </h3>
            <p className="text-sm text-gray-500">
              {t(
                'foundationOrganisationProfilePage.sections.edit.subtitle',
                'Use the form below to adjust capacity, pedagogy and languages. Changes are saved directly to the database.',
              )}
            </p>
            <OrganizationProfileForm />
          </div>
        </>
      )}
    </div>
  );
};

export default FoundationOrganisationProfilePage;
