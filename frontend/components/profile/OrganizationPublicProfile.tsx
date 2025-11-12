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
  BuildingOfficeIcon,
  IdentificationIcon,
  LinkIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { User, UserRole, Product, Service, JobListing, Organization } from '../../types';

type OrganizationPublicProfileProps = {
  user?: User; // Optional - for backward compatibility
  organization?: Organization; // New - direct organization data
  organizationId?: string; // New - fetch by ID (not implemented yet, for future use)
  showActions?: boolean; // New - show/hide action buttons
};

const SectionTitle: React.FC<{ icon: React.ElementType; title: string }> = ({ icon: Icon, title }) => (
  <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center gap-2">
    <Icon className="w-5 h-5 text-swiss-mint" />
    {title}
  </h2>
);

const OrganizationPublicProfile: React.FC<OrganizationPublicProfileProps> = ({ 
  user, 
  organization: organizationProp, 
  showActions = true 
}) => {
  const { t } = useTranslation(['profile', 'common']);
  
  // Support both ways: from user.primaryOrganization or direct organization prop
  const organization = organizationProp || user?.primaryOrganization;

  if (!organization) {
    return null;
  }

  // Determine role from organization type or user role
  const role = user?.role || (organization.type === 'FOUNDATION' ? UserRole.FOUNDATION : 
                              organization.type === 'PRODUCT_SUPPLIER' ? UserRole.PRODUCT_SUPPLIER : 
                              UserRole.SERVICE_PROVIDER);
  
  const organizationName = organization.name || user?.orgName || 'Organization';
  const coverImageUrl =
    organization.coverImageUrl ?? user?.orgCoverImageUrl ?? `https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80`;
  const logoUrl =
    organization.logoUrl ?? user?.orgLogoUrl ??
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
  
  // Get regions served - support both array and single canton
  const regionsServed = Array.isArray(organization.regionsServed) 
    ? organization.regionsServed 
    : (organization.canton ? [organization.canton] : []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Organization Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Organization Details */}
          <Card className="p-6 space-y-4">
            <SectionTitle
              icon={BuildingOfficeIcon}
              title={t('profile:organization.organizationDetails', { defaultValue: 'Organization Details' })}
            />
            <div className="space-y-3 text-sm">
              {organization.vatNumber && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.vatNumber', { defaultValue: 'VAT Number' })}</p>
                  <p className="text-gray-700 font-medium">{organization.vatNumber}</p>
                </div>
              )}
              
              {regionsServed.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('profile:organization.regionsServed', { defaultValue: 'Regions Served' })}</p>
                  <div className="flex flex-wrap gap-2">
                    {regionsServed.map((region, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-swiss-mint/10 text-swiss-mint border border-swiss-mint/20"
                      >
                        <MapPinIcon className="w-3 h-3 mr-1" />
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {organization.languages && organization.languages.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('profile:organization.languages', { defaultValue: 'Languages' })}</p>
                  <div className="flex flex-wrap gap-2">
                    {organization.languages.map((lang, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-swiss-teal/10 text-swiss-teal border border-swiss-teal/20"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {typeof organization.capacity === 'number' && role === UserRole.FOUNDATION && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.capacity', { defaultValue: 'Capacity' })}</p>
                  <p className="text-gray-700 font-medium flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4 text-gray-400" />
                    {organization.capacity} {t('profile:organization.children', { defaultValue: 'children' })}
                  </p>
                </div>
              )}

              {organization.pedagogy && organization.pedagogy.length > 0 && role === UserRole.FOUNDATION && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('profile:organization.pedagogy', { defaultValue: 'Pedagogical Approaches' })}</p>
                  <div className="flex flex-wrap gap-2">
                    {organization.pedagogy.map((approach, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200"
                      >
                        {approach}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-6 space-y-4">
            <SectionTitle icon={PhoneIcon} title={t('profile:organization.contact', { defaultValue: 'Contact' })} />
            <div className="space-y-3 text-sm">
              {organization.contactPerson && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.contactPerson', { defaultValue: 'Contact Person' })}</p>
                  <p className="text-gray-700 font-medium flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    {organization.contactPerson}
                  </p>
                </div>
              )}

              {organization.phoneNumber && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.phone', { defaultValue: 'Phone' })}</p>
                  <a 
                    href={`tel:${organization.phoneNumber}`} 
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    {organization.phoneNumber}
                  </a>
                </div>
              )}

              {user?.email && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.email', { defaultValue: 'Email' })}</p>
                  <a 
                    href={`mailto:${user.email}`} 
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    {user.email}
                  </a>
                </div>
              )}

              {organization.bookingLink && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.website', { defaultValue: 'Website / Booking' })}</p>
                  <a
                    href={organization.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                  >
                    <GlobeAltIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{organization.bookingLink}</span>
                  </a>
                </div>
              )}

              {organization.directOrderLink && role === UserRole.PRODUCT_SUPPLIER && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.directOrder', { defaultValue: 'Direct Order' })}</p>
                  <a
                    href={organization.directOrderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{organization.directOrderLink}</span>
                  </a>
                </div>
              )}

              {organization.catalogUrl && role === UserRole.PRODUCT_SUPPLIER && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile:organization.catalog', { defaultValue: 'Catalog' })}</p>
                  <a
                    href={organization.catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{t('profile:organization.viewCatalog', { defaultValue: 'View Catalog' })}</span>
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Supplier/Service Provider Specific Info */}
          {(role === UserRole.PRODUCT_SUPPLIER || role === UserRole.SERVICE_PROVIDER) && (
            <Card className="p-6 space-y-4">
              <SectionTitle
                icon={IdentificationIcon}
                title={t('profile:organization.businessInfo', { defaultValue: 'Business Information' })}
              />
              <div className="space-y-3 text-sm">
                {organization.productCategory && role === UserRole.PRODUCT_SUPPLIER && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('profile:organization.productCategory', { defaultValue: 'Product Category' })}</p>
                    <p className="text-gray-700 font-medium">{organization.productCategory}</p>
                  </div>
                )}

                {typeof organization.minimumOrderQuantity === 'number' && role === UserRole.PRODUCT_SUPPLIER && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('profile:organization.minOrderQty', { defaultValue: 'Minimum Order Quantity' })}</p>
                    <p className="text-gray-700 font-medium">{organization.minimumOrderQuantity}</p>
                  </div>
                )}

                {organization.serviceType && role === UserRole.SERVICE_PROVIDER && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('profile:organization.serviceType', { defaultValue: 'Service Type' })}</p>
                    <p className="text-gray-700 font-medium">{organization.serviceType}</p>
                  </div>
                )}

                {organization.serviceCategories && organization.serviceCategories.length > 0 && role === UserRole.SERVICE_PROVIDER && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t('profile:organization.serviceCategories', { defaultValue: 'Service Categories' })}</p>
                    <div className="flex flex-wrap gap-2">
                      {organization.serviceCategories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
                        >
                          {category.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {organization.deliveryType && role === UserRole.SERVICE_PROVIDER && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('profile:organization.deliveryType', { defaultValue: 'Delivery Type' })}</p>
                    <p className="text-gray-700 font-medium">{organization.deliveryType}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          {organization.description && (
            <Card className="p-6 space-y-3">
              <SectionTitle icon={GlobeAltIcon} title={t('profile:organization.about', { defaultValue: 'About' })} />
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{organization.description}</p>
            </Card>
          )}

          {/* Products Section - Suppliers */}
          {role === UserRole.PRODUCT_SUPPLIER && (
            <Card className="p-6 space-y-4">
              <SectionTitle
                icon={ShoppingCartIcon}
                title={t('profile:organization.products', { defaultValue: 'Products' })}
              />
              {products.length > 0 ? (
                <div className="grid gap-4">
                  {products.map(product => (
                    <div key={product.id} className="flex gap-4 border border-gray-100 rounded-lg p-4 hover:border-swiss-mint/50 transition-colors">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-swiss-charcoal">{product.title}</h3>
                        {product.category && (
                          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">{product.category}</p>
                        )}
                        {product.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                        )}
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {typeof product.price === 'number' && (
                        <div className="text-right flex-shrink-0">
                          <span className="text-swiss-mint font-semibold text-lg">CHF {product.price.toFixed(2)}</span>
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

          {/* Services Section - Service Providers */}
          {role === UserRole.SERVICE_PROVIDER && (
            <Card className="p-6 space-y-4">
              <SectionTitle
                icon={ListBulletIcon}
                title={t('profile:organization.services', { defaultValue: 'Services' })}
              />
              {services.length > 0 ? (
                <div className="grid gap-4">
                  {services.map(service => (
                    <div key={service.id} className="flex flex-col gap-2 border border-gray-100 rounded-lg p-4 hover:border-swiss-mint/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-swiss-charcoal">{service.title}</h3>
                          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
                            {service.category?.toString()?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        {service.price && (
                          <span className="text-swiss-mint font-semibold ml-4">
                            CHF {service.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-600">{service.description}</p>
                      )}
                      {(service.deliveryType || service.bookingLink) && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
                          {service.deliveryType && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                              <MapPinIcon className="w-3 h-3" />
                              {service.deliveryType}
                            </span>
                          )}
                          {service.bookingLink && (
                            <a
                              href={service.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-swiss-mint/10 text-swiss-mint rounded-full px-2 py-1 hover:bg-swiss-mint/20"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {t('profile:organization.bookService', { defaultValue: 'Book Now' })}
                            </a>
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

          {/* Job Listings Section - Foundations */}
          {role === UserRole.FOUNDATION && (
            <Card className="p-6 space-y-4">
              <SectionTitle
                icon={AcademicCapIcon}
                title={t('profile:organization.openRoles', { defaultValue: 'Open Roles' })}
              />
              {jobListings.length > 0 ? (
                <div className="grid gap-4">
                  {jobListings.map(job => (
                    <div key={job.id} className="border border-gray-100 rounded-lg p-4 space-y-2 hover:border-swiss-mint/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-swiss-charcoal">{job.title}</h3>
                          {job.location && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              {job.location}
                            </p>
                          )}
                        </div>
                        {job.salary && (
                          <span className="text-swiss-mint font-semibold text-sm ml-4">
                            {job.salary}
                          </span>
                        )}
                      </div>
                      {job.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                      )}
                      {job.contractType && (
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {job.contractType}
                        </span>
                      )}
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

      {/* Action Buttons */}
      {showActions && (
        <Card className="p-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {organization.directOrderLink && role === UserRole.PRODUCT_SUPPLIER && (
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
            {organization.catalogUrl && role === UserRole.PRODUCT_SUPPLIER && (
              <Button
                variant="outline"
                onClick={() => window.open(organization.catalogUrl!, '_blank', 'noopener,noreferrer')}
              >
                {t('profile:organization.actions.viewCatalog', { defaultValue: 'View Catalog' })}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default OrganizationPublicProfile;
