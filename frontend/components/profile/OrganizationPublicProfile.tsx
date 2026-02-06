import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
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
import OrganizationDocumentsList from './OrganizationDocumentsList';
import { User, UserRole, Product, Service, JobListing, Organization } from '../../types';
import { formatServiceCategory, formatServiceCategoryForService, formatServiceDeliveryType, formatCategory } from '../../utils/serviceFormatting';
import { openExternalUrl, toExternalUrl } from '../../utils/url';

type OrganizationPublicProfileProps = {
  user?: User;
  organization?: Organization;
  showActions?: boolean;
  currentUser?: User; // The currently logged-in user (for admin/super admin access checks)
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
  showActions = true,
  currentUser,
}) => {
  const { t } = useTranslation(['profile', 'common']);
  
  // Get organization from prop or user's primary organization
  const organization = organizationProp || user?.primaryOrganization;

  // If no organization, show message
  if (!organization) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center">{t('profile:empty.organization', { defaultValue: 'No organization information available yet.' })}</p>
      </Card>
    );
  }

  // Ensure we have at least basic organization data
  if (!organization.id || !organization.name) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center">{t('profile:organization.invalidData', { defaultValue: 'Invalid organization data.' })}</p>
      </Card>
    );
  }

  // Determine role
  const role = user?.role || 
    (organization.type === 'FOUNDATION' ? UserRole.FOUNDATION : 
     organization.type === 'PRODUCT_SUPPLIER' ? UserRole.PRODUCT_SUPPLIER : 
     UserRole.SERVICE_PROVIDER);

  // Get data with safe defaults
  const regionsServed = Array.isArray(organization.regionsServed) 
    ? organization.regionsServed 
    : (organization.canton ? [organization.canton] : []);
  
  const languages = Array.isArray(organization.languages) ? organization.languages : [];
  const products: Product[] = Array.isArray(organization.products) ? organization.products : [];
  const services: Service[] = Array.isArray(organization.services) ? organization.services : [];
  const jobListings: JobListing[] = Array.isArray(organization.jobListings) ? organization.jobListings : [];
  const serviceCategories = Array.isArray(organization.serviceCategories) ? organization.serviceCategories : [];
  const pedagogy = Array.isArray(organization.pedagogy) ? organization.pedagogy : [];
  const websiteHref = toExternalUrl(organization.websiteUrl);
  const bookingHref = toExternalUrl(organization.bookingLink);

  return (
    <div className="space-y-6 w-full">
      {/* Organization Details Section - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Organization Details Card */}
          <Card className="p-6 space-y-4">
            <SectionTitle
              icon={BuildingOfficeIcon}
              title={t('profile:organization.organizationDetails', { defaultValue: 'Organization Details' })}
            />
            <div className="space-y-4 text-sm">
              {/* VAT Number - Always show */}
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {t('profile:organization.vatNumber', { defaultValue: 'VAT Number' })}
                </p>
                <p className="text-gray-700">
                  {organization.vatNumber || <span className="text-gray-400 italic">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</span>}
                </p>
              </div>
              
              {/* Regions Served - Always show */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  {t('profile:organization.regionsServed', { defaultValue: 'Regions Served' })}
                </p>
                {regionsServed.length > 0 ? (
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
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.noRegionsSpecified', { defaultValue: 'No regions specified' })}</p>
                )}
              </div>

              {/* Languages - Always show */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  {t('profile:organization.languages', { defaultValue: 'Languages' })}
                </p>
                {languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-swiss-teal/10 text-swiss-teal border border-swiss-teal/20"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.noLanguagesSpecified', { defaultValue: 'No languages specified' })}</p>
                )}
              </div>

              {/* Foundation-specific fields */}
              {role === UserRole.FOUNDATION && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">
                      {t('profile:organization.capacity', { defaultValue: 'Capacity' })}
                    </p>
                    <p className="text-gray-700">
                      {typeof organization.capacity === 'number' ? (
                        <span className="flex items-center gap-2">
                          <AcademicCapIcon className="w-4 h-4 text-gray-400" />
                          {organization.capacity} {t('profile:organization.children', { defaultValue: 'children' })}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">{t('profile:organization.notSpecified', { defaultValue: 'Not specified' })}</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      {t('profile:organization.pedagogy', { defaultValue: 'Pedagogical Approaches' })}
                    </p>
                    {pedagogy.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pedagogy.map((approach, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200"
                          >
                            {approach}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-xs">{t('profile:organization.noPedagogySpecified', { defaultValue: 'No pedagogical approaches specified' })}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Contact Information Card */}
          <Card className="p-6 space-y-4">
            <SectionTitle icon={PhoneIcon} title={t('profile:organization.contact', { defaultValue: 'Contact' })} />
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {t('profile:organization.contactPerson', { defaultValue: 'Contact Person' })}
                </p>
                {organization.contactPerson ? (
                  <p className="text-gray-700 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    {organization.contactPerson}
                  </p>
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {t('profile:organization.phone', { defaultValue: 'Phone' })}
                </p>
                {organization.phoneNumber ? (
                  <a 
                    href={`tel:${organization.phoneNumber}`} 
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    {organization.phoneNumber}
                  </a>
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {t('profile:organization.email', { defaultValue: 'Email' })}
                </p>
                {user?.email ? (
                  <a 
                    href={`mailto:${user.email}`} 
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    {user.email}
                  </a>
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {t('profile:organization.website', { defaultValue: 'Website' })}
                </p>
                {organization.websiteUrl && websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                  >
                    <GlobeAltIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{organization.websiteUrl}</span>
                  </a>
                ) : organization.websiteUrl ? (
                  <p className="text-gray-700 flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{organization.websiteUrl}</span>
                  </p>
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {t('profile:organization.bookingLink', { defaultValue: 'Booking Link' })}
                </p>
                {organization.bookingLink && bookingHref ? (
                  <a
                    href={bookingHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{organization.bookingLink}</span>
                  </a>
                ) : organization.bookingLink ? (
                  <p className="text-gray-700 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{organization.bookingLink}</span>
                  </p>
                ) : (
                  <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                )}
              </div>

              {role === UserRole.PRODUCT_SUPPLIER && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">
                      {t('profile:organization.directOrder', { defaultValue: 'Direct Order' })}
                    </p>
                    {organization.directOrderLink ? (
                      <a
                        href={toExternalUrl(organization.directOrderLink) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                      >
                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{organization.directOrderLink}</span>
                      </a>
                    ) : (
                      <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">
                      {t('profile:organization.catalog', { defaultValue: 'Catalog' })}
                    </p>
                    {organization.catalogUrl ? (
                      <a
                        href={toExternalUrl(organization.catalogUrl) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-swiss-mint hover:text-swiss-teal flex items-center gap-2 truncate"
                      >
                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{t('profile:organization.viewCatalog', { defaultValue: 'View Catalog' })}</span>
                      </a>
                    ) : (
                      <p className="text-gray-400 italic text-xs">{t('profile:organization.notProvided', { defaultValue: 'Not provided' })}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Business Information Card - For Suppliers and Service Providers */}
          {(role === UserRole.PRODUCT_SUPPLIER || role === UserRole.SERVICE_PROVIDER) && (
            <Card className="p-6 space-y-4">
              <SectionTitle
                icon={IdentificationIcon}
                title={t('profile:organization.businessInfo', { defaultValue: 'Business Information' })}
              />
              <div className="space-y-4 text-sm">
                {role === UserRole.PRODUCT_SUPPLIER && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        {t('profile:organization.productCategory', { defaultValue: 'Product Category' })}
                      </p>
                      <p className="text-gray-700">
                        {organization.productCategory ? formatCategory(organization.productCategory) : <span className="text-gray-400 italic text-xs">{t('profile:organization.notSpecified', { defaultValue: 'Not specified' })}</span>}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        {t('profile:organization.minOrderQty', { defaultValue: 'Minimum Order Quantity' })}
                      </p>
                      <p className="text-gray-700">
                        {typeof organization.minimumOrderQuantity === 'number' 
                          ? organization.minimumOrderQuantity 
                          : <span className="text-gray-400 italic text-xs">{t('profile:organization.notSpecified', { defaultValue: 'Not specified' })}</span>}
                      </p>
                    </div>
                  </>
                )}

                {role === UserRole.SERVICE_PROVIDER && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        {t('profile:organization.serviceType', { defaultValue: 'Service Type' })}
                      </p>
                      <p className="text-gray-700">
                        {organization.serviceType || <span className="text-gray-400 italic text-xs">{t('profile:organization.notSpecified', { defaultValue: 'Not specified' })}</span>}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">
                        {t('profile:organization.serviceCategories', { defaultValue: 'Service Categories' })}
                      </p>
                        {serviceCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {serviceCategories.map((category, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
                              >
                                {formatServiceCategory(t, category)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 italic text-xs">{t('profile:organization.noServiceCategories', { defaultValue: 'No service categories specified' })}</p>
                        )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        {t('profile:organization.deliveryType', { defaultValue: 'Delivery Type' })}
                      </p>
                        <p className="text-gray-700">
                          {organization.deliveryType
                            ? formatServiceDeliveryType(t, organization.deliveryType)
                            : <span className="text-gray-400 italic text-xs">{t('profile:organization.notSpecified', { defaultValue: 'Not specified' })}</span>}
                        </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          <Card className="p-6 space-y-3">
            <SectionTitle icon={GlobeAltIcon} title={t('profile:organization.about', { defaultValue: 'About' })} />
            {organization.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{organization.description}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">{t('profile:organization.noDescription', { defaultValue: 'No description provided.' })}</p>
            )}
          </Card>

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
                          <p className="text-xs tracking-wide text-gray-400 mt-1">{formatCategory(product.category)}</p>
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
                    {t('profile:organization.empty.products', { defaultValue: 'No products listed.' })}
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
                            <p className="text-xs text-gray-500 mt-1">
                              {formatServiceCategoryForService(t, service)}
                            </p>
                        </div>
                        {typeof service.price === 'number' && (
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
                                {formatServiceDeliveryType(t, service.deliveryType)}
                            </span>
                          )}
                          {service.bookingLink && (
                            (() => {
                              const href = toExternalUrl(service.bookingLink);
                              if (!href) return null;
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-swiss-mint/10 text-swiss-mint rounded-full px-2 py-1 hover:bg-swiss-mint/20"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  {t('profile:organization.bookService', { defaultValue: 'Book Now' })}
                                </a>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t('profile:organization.empty.services', { defaultValue: 'No services listed.' })}
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
                    {t('profile:organization.empty.jobListings', { defaultValue: 'No job listings listed.' })}
                  </p>
                )}
            </Card>
          )}

          {/* Documents Section - For Suppliers and Service Providers, or when viewed by Admin/Super Admin */}
          {(role === UserRole.PRODUCT_SUPPLIER || 
            role === UserRole.SERVICE_PROVIDER || 
            currentUser?.role === UserRole.ADMIN || 
            currentUser?.role === UserRole.SUPER_ADMIN) && (
            <OrganizationDocumentsList organizationId={organization.id} />
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
                onClick={() => openExternalUrl(organization.directOrderLink)}
              >
                {t('profile:organization.actions.directOrder', { defaultValue: 'Direct Order' })}
              </Button>
            )}
            {organization.bookingLink && (
              <Button
                variant="outline"
                onClick={() => openExternalUrl(organization.bookingLink)}
              >
                {t('profile:organization.actions.bookNow', { defaultValue: 'Book Now' })}
              </Button>
            )}
            {organization.catalogUrl && role === UserRole.PRODUCT_SUPPLIER && (
              <Button
                variant="outline"
                onClick={() => openExternalUrl(organization.catalogUrl)}
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
