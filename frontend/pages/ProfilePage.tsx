import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarDaysIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useAuthContext } from '../providers/AuthProvider';
import { UserRole } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import OrganizationPublicProfile from '../components/profile/OrganizationPublicProfile';

const ProfilePage: React.FC = () => {
  const { currentUser } = useAppContext();
  const { refreshCurrentUser } = useAuthContext();
  const { t, i18n } = useTranslation(['profile', 'common']);
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh user data when the profile page loads to ensure we have the latest organization data
  useEffect(() => {
    const refreshUserData = async () => {
      if (!currentUser) return;
      
      // Only refresh if user should have an organization profile but doesn't have primaryOrganization
      const shouldHaveOrgProfile = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(currentUser.role);
      if (shouldHaveOrgProfile && !currentUser.primaryOrganization) {
        setIsRefreshing(true);
        try {
          await refreshCurrentUser();
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    refreshUserData();
  }, [currentUser?.id, refreshCurrentUser]);

  const locale = i18n.language || 'en';

  const formatDate = (value?: string | null) => {
    if (!value) {
      return '—';
    }

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return value;
    }
  };

  const roleLabel = useMemo(() => {
    if (!currentUser) {
      return '';
    }

    const roleKey = `common:userRoles.${currentUser.role}`;
    const friendlyRole = currentUser.role.replace(/_/g, ' ').toLowerCase();
    return t(roleKey, {
      defaultValue: friendlyRole
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    });
  }, [currentUser, t]);

  if (!currentUser) {
    return <div className="p-6 text-center text-gray-500">{t('common:loading', 'Loading...')}</div>;
  }

  const shouldShowPublicOrganizationProfile =
    [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(currentUser.role);
  
  const hasPrimaryOrganization = !!currentUser.primaryOrganization;
  const showPublicOrganizationProfile = shouldShowPublicOrganizationProfile && hasPrimaryOrganization;

  const avatarUrl =
    currentUser.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.email)}&background=48CFAE&color=ffffff&size=128&rounded=true`;

  return (
    <div className="p-8 space-y-6 bg-page-bg min-h-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">{t('profile:title')}</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-2xl">{t('profile:subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Frontend-Facing Profile Button */}
          {currentUser.role === UserRole.EDUCATOR && currentUser.id && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/profile/educator/${currentUser.id}`)}
            >
              {t('profile:actions.viewPublicProfile', 'View Public Profile')}
            </Button>
          )}
          {shouldShowPublicOrganizationProfile && hasPrimaryOrganization && currentUser.primaryOrganization?.id && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/profile/organization/${currentUser.primaryOrganization!.id}`)}
            >
              {t('profile:actions.viewOrganizationProfile', 'View Organization Profile')}
            </Button>
          )}
          <Button variant="light" onClick={() => navigate('/settings')}>
            {t('profile:actions.goToSettings')}
          </Button>
        </div>
      </div>

        {shouldShowPublicOrganizationProfile && (
          <>
            {hasPrimaryOrganization ? (
              <>
                <Card className="p-6 bg-swiss-mint/5 border border-swiss-mint/40 text-sm text-swiss-charcoal">
                  <div className="flex items-start justify-between gap-4">
                    <p>
                      {t(
                        'profile:publicViewNotice',
                        'This preview shows how your organization profile appears to other users on the platform.',
                      )}
                    </p>
                    {currentUser.primaryOrganization?.id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/profile/organization/${currentUser.primaryOrganization!.id}`)}
                      >
                        {t('profile:actions.viewFullProfile', 'View Full Profile')}
                      </Button>
                    )}
                  </div>
                </Card>
                <OrganizationPublicProfile user={currentUser} />
              </>
            ) : (
              <Card className="p-6 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">
                      {t('profile:organization.setupRequired', 'Organization Profile Setup Required')}
                    </p>
                    <p className="text-yellow-700">
                      {t(
                        'profile:organization.setupMessage',
                        'Your organization profile is not yet set up. Complete your organization information in Settings to see your public profile preview here.',
                      )}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/settings')}
                      className="mt-3"
                    >
                      {t('profile:actions.goToSettings', 'Go to Settings')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex items-start gap-4">
            <img
              src={avatarUrl}
              alt={currentUser.name}
              className="w-20 h-20 rounded-full border-2 border-swiss-mint/40 object-cover shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5 text-swiss-mint" />
                <h2 className="text-2xl font-semibold text-swiss-charcoal">{currentUser.name}</h2>
              </div>
              <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-swiss-mint/10 text-swiss-mint font-medium">
                  {roleLabel}
                </span>
                {currentUser.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {currentUser.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <EnvelopeIcon className="w-5 h-5 text-swiss-teal mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t('profile:details.email')}
                </p>
                <p className="text-sm text-swiss-charcoal">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDaysIcon className="w-5 h-5 text-swiss-teal mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t('profile:details.memberSince')}
                </p>
                <p className="text-sm text-swiss-charcoal">
                  {formatDate(currentUser.memberSince)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowPathIcon className="w-5 h-5 text-swiss-teal mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t('profile:details.lastActive')}
                </p>
                <p className="text-sm text-swiss-charcoal">
                  {formatDate(currentUser.lastActiveAt || currentUser.lastLogin)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCircleIcon className="w-5 h-5 text-swiss-teal mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t('profile:details.status')}
                </p>
                <p className="text-sm text-swiss-charcoal">
                  {currentUser.isActive ? t('common:status.active', 'Active') : t('common:status.inactive', 'Inactive')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

        {!showPublicOrganizationProfile && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BuildingOfficeIcon className="w-5 h-5 text-swiss-mint" />
              <h2 className="text-lg font-semibold text-swiss-charcoal">{t('profile:organization.sectionTitle')}</h2>
            </div>

            {currentUser.orgName || currentUser.plan || currentUser.region || currentUser.orgId ? (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentUser.orgName && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">
                      {t('profile:organization.name')}
                    </dt>
                    <dd className="text-sm text-swiss-charcoal mt-1">{currentUser.orgName}</dd>
                  </div>
                )}
                {currentUser.region && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">
                      {t('profile:organization.region')}
                    </dt>
                    <dd className="text-sm text-swiss-charcoal mt-1">{currentUser.region}</dd>
                  </div>
                )}
                {currentUser.plan && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">
                      {t('profile:organization.plan')}
                    </dt>
                    <dd className="text-sm text-swiss-charcoal mt-1">{currentUser.plan}</dd>
                  </div>
                )}
                {currentUser.orgId && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">
                      {t('profile:organization.id')}
                    </dt>
                    <dd className="text-sm text-swiss-charcoal mt-1 font-mono">{currentUser.orgId}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">{t('profile:empty.organization')}</p>
            )}
          </Card>
        )}
    </div>
  );
};

export default ProfilePage;
