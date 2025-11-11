import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  ShoppingCartIcon,
  ListBulletIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { User, UserRole, Product, Service, JobListing } from '../../types';

type OrganizationPublicProfileProps = {
  user: User;
};

const SectionTitle: React.FC<{ icon: React.ElementType; title: string }> = ({ icon: Icon, title }) => (
  <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center gap-2">
    <Icon className="w-5 h-5 text-swiss-mint" />
    {title}
  </h2>
);

const OrganizationPublicProfile: React.FC<OrganizationPublicProfileProps> = ({ user }) => {
  const { t } = useTranslation(['profile', 'common']);
  const organization = user.primaryOrganization;

  if (!organization) {
    return null;
  }

  const role = user.role;
  const organizationName = organization.name || user.orgName || 'Organization';
  const coverImageUrl =
    organization.coverImageUrl ?? user.orgCoverImageUrl ?? `https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80`;
  const logoUrl =
    organization.logoUrl ?? user.orgLogoUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(organizationName)}&background=2DD4BF&color=ffffff&size=128&rounded=true`;

  const tagList = useMemo(() => {
    if (role === UserRole.SERVICE_PROVIDER) {
      return organization.serviceCategories ?? [];
    }
    if (role === UserRole.FOUNDATION) {
      return organization.pedagogy ?? [];
    }
    if (role === UserRole.PRODUCT_SUPPLIER) {
      return organization.products?.flatMap(product => product.tags ?? []) ?? [];
    }
    return [];
  }, [organization, role]);

  const products: Product[] = Array.isArray(organization.products) ? organization.products : [];
  const services: Service[] = Array.isArray(organization.services) ? organization.services : [];
  const jobListings: JobListing[] = Array.isArray(organization.jobListings) ? organization.jobListings : [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-48 bg-gray-200 relative">
          <img src={coverImageUrl} alt={`${organization.name} cover`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <img
            src={logoUrl}
            alt={`${organization.name} logo`}
            className="absolute bottom-4 left-6 w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white object-cover"
          />
        </div>
        <div className="p-6 pt-28 sm:pt-6 sm:pl-36 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-swiss-charcoal">{organization.name || user.orgName || t('profile:organization.unnamed', 'Unnamed Organization')}</h1>
            <p className="text-gray-500 capitalize">
              {organization.type?.toString()?.replace(/_/g, ' ').toLowerCase() || user.orgType?.toString()?.replace(/_/g, ' ').toLowerCase() || ''}
            </p>
            {!!tagList.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tagList.slice(0, 6).map(tag => (
                  <span key={tag} className="text-xs bg-swiss-mint/10 text-swiss-mint px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
            <div className="flex flex-wrap gap-2">
              {organization.directOrderLink && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(organization.directOrderLink!, '_blank', 'noopener,noreferrer')}
                >
                  {t('profile:organization.actions.directOrder', { defaultValue: 'Direct Order' })}
                </Button>
              )}
              {organization.bookingLink && (
                <Button
                  variant="outline"
                  onClick={() => window.open(organization.bookingLink!, '_blank', 'noopener,noreferrer')}
                >
                  {t('profile:organization.actions.bookNow', { defaultValue: 'Book Now' })}
                </Button>
              )}
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
            <Card className="p-5 space-y-3">
              <SectionTitle
                icon={MapPinIcon}
                title={t('profile:organization.sectionTitle', { defaultValue: 'Organization' })}
              />
            <div className="space-y-2 text-sm text-gray-600">
              {organization.region && <p>{organization.region}</p>}
              {organization.canton && (
                <p className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-gray-400" />
                  {organization.canton}
                </p>
              )}
                {typeof organization.capacity === 'number' && (
                <p className="flex items-center gap-2">
                  <AcademicCapIcon className="w-4 h-4 text-gray-400" />
                    {t('profile:organization.capacity', {
                      defaultValue: 'Capacity: {{count}}',
                      count: organization.capacity,
                    })}
                </p>
              )}
            </div>
          </Card>

            <Card className="p-5 space-y-3">
              <SectionTitle icon={PhoneIcon} title={t('profile:organization.contact', { defaultValue: 'Contact' })} />
            <div className="space-y-2 text-sm text-gray-600">
              {organization.phoneNumber && (
                <p className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${organization.phoneNumber}`} className="hover:text-swiss-mint">
                    {organization.phoneNumber}
                  </a>
                </p>
              )}
              <p className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${user.email}`} className="hover:text-swiss-mint">
                  {user.email}
                </a>
              </p>
              {organization.bookingLink && (
                <p className="flex items-center gap-2">
                  <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                  <a
                    href={organization.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-swiss-mint truncate"
                  >
                    {organization.bookingLink}
                  </a>
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {organization.description && (
            <Card className="p-6 space-y-3">
              <SectionTitle icon={GlobeAltIcon} title={t('profile:organization.about', { defaultValue: 'About' })} />
              <p className="text-sm text-gray-600 whitespace-pre-line">{organization.description}</p>
            </Card>
          )}

          {role === UserRole.PRODUCT_SUPPLIER && (
            <Card className="p-6 space-y-4">
                <SectionTitle
                  icon={ShoppingCartIcon}
                  title={t('profile:organization.products', { defaultValue: 'Products' })}
                />
              {products.length ? (
                <div className="grid gap-4">
                  {products.map(product => (
                    <div key={product.id} className="flex gap-4 border border-gray-100 rounded-lg p-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-swiss-charcoal">{product.title}</h3>
                        {product.category && (
                          <p className="text-xs uppercase tracking-wide text-gray-400">{product.category}</p>
                        )}
                        {product.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>}
                      </div>
                      {typeof product.price === 'number' && (
                        <div className="text-right">
                          <span className="text-swiss-mint font-semibold">CHF {product.price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t('profile:organization.empty.products', { defaultValue: 'No products published yet.' })}
                </p>
              )}
            </Card>
          )}

          {role === UserRole.SERVICE_PROVIDER && (
            <Card className="p-6 space-y-4">
                <SectionTitle
                  icon={ListBulletIcon}
                  title={t('profile:organization.services', { defaultValue: 'Services' })}
                />
              {services.length ? (
                <div className="grid gap-4">
                  {services.map(service => (
                    <div key={service.id} className="flex flex-col gap-1 border border-gray-100 rounded-lg p-4">
                      <h3 className="font-semibold text-swiss-charcoal">{service.title}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {service.category?.toString()?.replace(/_/g, ' ')}
                      </p>
                      {service.description && <p className="text-sm text-gray-600 mt-1">{service.description}</p>}
                      {(service.price || service.deliveryType) && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
                          {service.price && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                              CHF {service.price.toFixed(2)}
                            </span>
                          )}
                          {service.deliveryType && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                              {service.deliveryType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t('profile:organization.empty.services', { defaultValue: 'No services published yet.' })}
                </p>
              )}
            </Card>
          )}

          {role === UserRole.FOUNDATION && (
            <Card className="p-6 space-y-4">
                <SectionTitle
                  icon={AcademicCapIcon}
                  title={t('profile:organization.openRoles', { defaultValue: 'Open Roles' })}
                />
              {jobListings.length ? (
                <div className="grid gap-4">
                  {jobListings.map(job => (
                    <div key={job.id} className="border border-gray-100 rounded-lg p-4 space-y-1">
                      <h3 className="font-semibold text-swiss-charcoal">{job.title}</h3>
                      {job.location && <p className="text-xs text-gray-400">{job.location}</p>}
                      {job.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{job.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                  <p className="text-sm text-gray-500">
                    {t('profile:organization.empty.jobListings', { defaultValue: 'No job listings published yet.' })}
                  </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationPublicProfile;
