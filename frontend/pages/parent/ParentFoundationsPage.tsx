import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { UserRole } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  InboxIcon,
  StarIcon,
  LanguageIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { SWISS_CANTONS } from '../../constants';

interface Foundation {
  id: string;
  name: string;
  description?: string;
  region?: string;
  canton?: string;
  city?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  contactPerson?: string;
  phoneNumber?: string;
  catalogUrl?: string;
  logoUrl?: string;
  isActive?: boolean;
}

interface OrganizationsResponse {
  organizations: Foundation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ParentFoundationsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();

  // State
  const [foundations, setFoundations] = useState<Foundation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCanton, setFilterCanton] = useState<string>('');

  // Fetch foundations
  const fetchFoundations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('type', 'FOUNDATION');
      params.append('isActive', 'true');
      if (filterCanton) params.append('region', filterCanton);
      if (searchQuery) params.append('search', searchQuery);

      const response = await authenticatedRequest<OrganizationsResponse>(
        `/compat/organizations?${params.toString()}`
      );

      if (response.success && response.data) {
        setFoundations(response.data.organizations || []);
      }
    } catch (err) {
      console.error('Error fetching foundations:', err);
      setError(t('common:errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [authenticatedRequest, filterCanton, searchQuery, t]);

  useEffect(() => {
    fetchFoundations();
  }, [fetchFoundations]);

  // Access check
  if (!currentUser || currentUser.role !== UserRole.PARENT) {
    return (
      <div className="text-center p-10">
        <h1 className="text-2xl font-bold text-swiss-charcoal">
          {t('parentFoundationsPage.accessDenied.title', 'Access Denied')}
        </h1>
        <p className="text-gray-600">
          {t('parentFoundationsPage.accessDenied.message', 'This page is only accessible to parents.')}
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 mr-3 text-swiss-mint" />
            {t('parentFoundationsPage.title', 'Browse Daycares')}
          </h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <BuildingOfficeIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('parentFoundationsPage.title', 'Browse Daycares')}
        </h1>
        <Card className="p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchFoundations}>{t('common:buttons.retry')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 mr-3 text-swiss-mint" />
            {t('parentFoundationsPage.title', 'Browse Daycares')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('parentFoundationsPage.subtitle', 'Explore daycares in your area and find the perfect fit for your child')}
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => navigate('/parent-lead-form')}
        >
          {t('parentFoundationsPage.sendEnquiry', 'Send an Enquiry')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('parentFoundationsPage.searchPlaceholder', 'Search by name...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
          />
        </div>

        <select
          value={filterCanton}
          onChange={(e) => setFilterCanton(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
        >
          <option value="">{t('parentFoundationsPage.allCantons', 'All Cantons')}</option>
          {SWISS_CANTONS.map((canton) => (
            <option key={canton} value={canton}>
              {canton}
            </option>
          ))}
        </select>

        <Button variant="outline" onClick={fetchFoundations}>
          {t('common:buttons.search', 'Search')}
        </Button>
      </div>

      {/* Empty state */}
      {foundations.length === 0 && (
        <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">
            {t('parentFoundationsPage.emptyState.title', 'No Daycares Found')}
          </h2>
          <p className="text-gray-500 mb-4">
            {t('parentFoundationsPage.emptyState.message', 'Try adjusting your search filters or send a general enquiry.')}
          </p>
          <Button variant="primary" onClick={() => navigate('/parent-lead-form')}>
            {t('parentFoundationsPage.sendEnquiry', 'Send an Enquiry')}
          </Button>
        </Card>
      )}

      {/* Foundations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {foundations.map((foundation) => (
          <Card key={foundation.id} className="flex flex-col p-5 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              {foundation.logoUrl ? (
                <img
                  src={foundation.logoUrl}
                  alt={foundation.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-swiss-mint/10 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-8 h-8 text-swiss-mint" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-swiss-charcoal truncate">
                  {foundation.name}
                </h3>
                {(foundation.city || foundation.canton || foundation.region) && (
                  <p className="text-sm text-gray-500 flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    {foundation.city && foundation.canton
                      ? `${foundation.city}, ${foundation.canton}`
                      : foundation.city || foundation.canton || foundation.region}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {foundation.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {foundation.description}
              </p>
            )}

            {/* Details */}
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              {foundation.languages && foundation.languages.length > 0 && (
                <div className="flex items-center">
                  <LanguageIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{foundation.languages.join(', ')}</span>
                </div>
              )}
              {foundation.capacity && (
                <div className="flex items-center">
                  <UsersIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{t('parentFoundationsPage.capacity', 'Capacity')}: {foundation.capacity}</span>
                </div>
              )}
              {foundation.pedagogy && foundation.pedagogy.length > 0 && (
                <div className="flex items-center">
                  <StarIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{foundation.pedagogy.join(', ')}</span>
                </div>
              )}
              {foundation.phoneNumber && (
                <div className="flex items-center">
                  <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{foundation.phoneNumber}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto pt-4 border-t border-gray-200 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/parent-lead-form')}
              >
                {t('parentFoundationsPage.enquire', 'Enquire')}
              </Button>
              {foundation.catalogUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={GlobeAltIcon}
                  onClick={() => window.open(foundation.catalogUrl, '_blank')}
                >
                  {t('parentFoundationsPage.website', 'Website')}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Results count */}
      {foundations.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          {t('parentFoundationsPage.resultsCount', 'Showing {{count}} daycares', { count: foundations.length })}
        </p>
      )}
    </div>
  );
};

export default ParentFoundationsPage;
