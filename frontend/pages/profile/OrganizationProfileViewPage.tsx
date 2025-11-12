import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import OrganizationPublicProfile from '../../components/profile/OrganizationPublicProfile';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Organization, UserRole } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useMessaging } from '../../contexts/MessagingContext';

const OrganizationProfileViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['profile', 'common']);
  const { request } = useAuthenticatedApi();
  const { currentUser } = useAppContext();
  const { startOrGetConversation } = useMessaging();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!id) {
        setError('Organization ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await request<{ success: boolean; data: Organization }>(`/profiles/organization/${id}`);
        
        if (response.success && response.data) {
          // Transform the API response to match Organization type
          const orgData = response.data;
          console.log('🔍 OrganizationProfileViewPage - Raw API response:', orgData);
          
          // For service providers, check if deliveryType/bookingLink are in the serviceProviders relation
          const serviceProviderData = (orgData as any).serviceProviders?.[0];
          const deliveryType = orgData.deliveryType || serviceProviderData?.deliveryType || null;
          const bookingLink = orgData.bookingLink || serviceProviderData?.bookingLink || null;
          
          // Store raw data for accessing members
          const transformedOrg: Organization & { __rawData?: any } = {
            __rawData: orgData,
            id: orgData.id,
            name: orgData.name,
            type: orgData.type,
            region: orgData.region,
            description: orgData.description,
            vatNumber: orgData.vatNumber,
            contactPerson: orgData.contactPerson,
            phoneNumber: orgData.phoneNumber,
            canton: orgData.canton,
            regionsServed: Array.isArray(orgData.regionsServed) ? orgData.regionsServed : (orgData.canton ? [orgData.canton] : []),
            languages: orgData.languages || [],
            capacity: orgData.capacity,
            pedagogy: orgData.pedagogy || [],
            productCategory: orgData.productCategory,
            serviceType: orgData.serviceType,
            minimumOrderQuantity: orgData.minimumOrderQuantity,
            directOrderLink: orgData.directOrderLink,
            catalogUrl: orgData.catalogUrl,
            serviceCategories: orgData.serviceCategories || [],
            deliveryType: deliveryType,
            bookingLink: bookingLink,
            isActive: orgData.isActive ?? true,
            createdAt: orgData.createdAt,
            updatedAt: orgData.updatedAt,
            logoAssetId: orgData.logoAssetId,
            coverAssetId: orgData.coverAssetId,
            logoUrl: (orgData as any).logoAsset?.publicUrl ?? null,
            coverImageUrl: (orgData as any).coverAsset?.publicUrl ?? null,
            products: (orgData as any).products?.map((p: any) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              price: p.price,
              category: p.category,
              tags: p.tags || [],
              status: p.status,
              isActive: p.isActive,
              supplierId: p.supplierId,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              imageAssetId: p.imageAssetId,
              imageUrl: p.imageAsset?.publicUrl ?? null,
            })) || [],
            services: ((orgData as any).serviceProviders || []).flatMap((provider: any) =>
              (provider.services || []).map((service: any) => ({
                id: service.id,
                title: service.title,
                description: service.description,
                category: service.category,
                price: service.price,
                isActive: service.isActive,
                providerId: service.providerId,
                createdAt: service.createdAt,
                updatedAt: service.updatedAt,
                deliveryType: provider.deliveryType || null,
                bookingLink: provider.bookingLink || null,
              }))
            ) || [],
            jobListings: (orgData as any).jobListings || [],
          };
          console.log('🔍 OrganizationProfileViewPage - Transformed organization:', transformedOrg);
          setOrganization(transformedOrg);
        } else {
          setError('Organization not found');
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load organization profile');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [id, request]);

  const handleSendMessage = () => {
    if (!organization || !currentUser) return;
    
    // Find the primary contact user for this organization from the API response
    const orgData = (organization as any).__rawData || organization;
    const primaryMember = orgData.members?.[0]?.user;
    if (primaryMember) {
      const conversationId = startOrGetConversation(
        primaryMember.id,
        primaryMember.firstName && primaryMember.lastName
          ? `${primaryMember.firstName} ${primaryMember.lastName}`
          : organization.name,
        primaryMember.role || UserRole.FOUNDATION
      );
      navigate(`/messages/${conversationId}`);
    } else {
      alert(t('profile:organization.noContactAvailable', 'No contact available for this organization.'));
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <LoadingSpinner text={t('common:loading', 'Loading...')} />
        </Card>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-red-600">{error || t('profile:organization.notFound', 'Organization not found')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon}>
                {t('common:buttons.goBack', 'Go Back')}
              </Button>
              <Button variant="primary" onClick={() => window.location.reload()}>
                {t('common:buttons.retry', 'Retry')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
        {t('common:buttons.goBack', 'Go Back')}
      </Button>

      {/* Social Media Style Header with Cover Image and Avatar */}
      <Card className="overflow-hidden p-0">
        {/* Cover Image Section */}
        <div className="h-64 bg-gradient-to-r from-swiss-mint/20 to-swiss-teal/20 relative">
          {organization.coverImageUrl ? (
            <img
              src={organization.coverImageUrl}
              alt={`${organization.name} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-swiss-mint/30 via-swiss-teal/20 to-swiss-mint/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* Avatar/Logo Section - Positioned at bottom of cover */}
          <div className="absolute bottom-0 left-6 transform translate-y-1/2">
            <div className="relative">
              <img
                src={organization.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(organization.name)}&background=2DD4BF&color=ffffff&size=160&rounded=true`}
                alt={`${organization.name} logo`}
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-white object-cover"
              />
            </div>
          </div>
        </div>

        {/* Profile Header Content */}
        <div className="pt-20 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-swiss-charcoal">{organization.name}</h1>
              <p className="text-gray-500 capitalize mt-1">
                {organization.type?.toString()?.replace(/_/g, ' ').toLowerCase()}
              </p>
              {organization.description && (
                <p className="text-gray-600 mt-3 max-w-2xl">{organization.description}</p>
              )}
            </div>
            {currentUser && currentUser.id !== (organization as any).__rawData?.members?.[0]?.user?.id && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  leftIcon={EnvelopeIcon}
                  onClick={handleSendMessage}
                >
                  {t('common:buttons.sendMessage', 'Send Message')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Organization Details */}
      {(() => {
        console.log('🔍 OrganizationProfileViewPage - About to render OrganizationPublicProfile');
        console.log('🔍 OrganizationProfileViewPage - organization:', organization);
        return <OrganizationPublicProfile organization={organization} showActions={true} />;
      })()}
    </div>
  );
};

export default OrganizationProfileViewPage;
