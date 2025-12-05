import React, { useState, useEffect } from 'react';
import { Partner, PARTNER_TYPE_LABELS, PartnerType } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { BuildingStorefrontIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftEllipsisIcon, GlobeAltIcon, EnvelopeIcon, PhoneIcon, UserIcon, StarIcon, MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SwissFlagIcon } from '../components/icons/CustomIcons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

// Partner type options for the form
const PARTNER_TYPES: { value: PartnerType; labelKey: string }[] = [
  { value: 'ACADEMIC', labelKey: 'partners.types.academic' },
  { value: 'CORPORATE', labelKey: 'partners.types.corporate' },
  { value: 'GOVERNMENTAL', labelKey: 'partners.types.governmental' },
  { value: 'NON_PROFIT', labelKey: 'partners.types.nonProfit' },
  { value: 'MEDIA', labelKey: 'partners.types.media' },
  { value: 'TECHNOLOGY', labelKey: 'partners.types.technology' },
];

// Partner Application Modal
interface PartnerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PartnerApplicationModal: React.FC<PartnerApplicationModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    type: 'CORPORATE' as PartnerType,
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    countryRegion: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiService.post('/partners/apply', formData);
      if (response.success) {
        setSubmitSuccess(true);
        // Reset form
        setFormData({
          organizationName: '',
          type: 'CORPORATE',
          contactPerson: '',
          contactEmail: '',
          contactPhone: '',
          websiteUrl: '',
          countryRegion: '',
          message: '',
        });
      } else {
        setSubmitError(response.message || t('partners.application.error'));
      }
    } catch (err: any) {
      console.error('Failed to submit application:', err);
      setSubmitError(err.message || t('partners.application.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitSuccess(false);
    setSubmitError(null);
    onClose();
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-application-title"
          className="relative w-full max-w-xl bg-white shadow-xl rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 id="partner-application-title" className="text-xl font-semibold text-gray-900">
              {t('partners.application.title', 'Partner Application')}
            </h2>
            <button
              onClick={handleClose}
              aria-label={t('common:buttons.close', 'Close')}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {submitSuccess ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('partners.application.successTitle', 'Application Submitted!')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('partners.application.successMessage', 'Thank you for your interest. Our team will review your application and contact you soon.')}
              </p>
              <Button variant="primary" onClick={handleClose}>
                {t('common:buttons.close', 'Close')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('partners.application.organizationName', 'Organization Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder={t('partners.application.organizationNamePlaceholder', 'Enter your organization name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('partners.application.partnerType', 'Partner Type')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent appearance-none bg-white"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PartnerType })}
                  >
                    {PARTNER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {t(type.labelKey, PARTNER_TYPE_LABELS[type.value])}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partners.application.contactPerson', 'Contact Person')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder={t('partners.application.contactPersonPlaceholder', 'Full name')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partners.application.contactEmail', 'Email Address')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder={t('partners.application.contactEmailPlaceholder', 'contact@example.com')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partners.application.contactPhone', 'Phone Number')}
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder={t('partners.application.contactPhonePlaceholder', '+41 XX XXX XX XX')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partners.application.countryRegion', 'Country/Region')}
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                    value={formData.countryRegion}
                    onChange={(e) => setFormData({ ...formData, countryRegion: e.target.value })}
                    placeholder={t('partners.application.countryRegionPlaceholder', 'e.g., Switzerland')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('partners.application.websiteUrl', 'Website URL')}
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder={t('partners.application.websiteUrlPlaceholder', 'https://www.example.com')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('partners.application.message', 'Tell us about your organization')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t('partners.application.messagePlaceholder', 'Describe your organization and why you would like to partner with us...')}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  {t('common:buttons.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? t('partners.application.submitting', 'Submitting...') : t('partners.application.submit', 'Submit Application')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Loading skeleton component
const PartnerCardSkeleton: React.FC = () => (
  <Card className="text-center p-6">
    <div className="animate-pulse">
      <div className="h-20 w-20 bg-gray-200 rounded-lg mx-auto mb-4"></div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto mb-3"></div>
      <div className="h-16 bg-gray-200 rounded w-full mb-4"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
  </Card>
);

const PartnerCard: React.FC<{ partner: Partner }> = ({ partner }) => {
  const { t } = useTranslation(['admin', 'common']);
  const typeLabel = PARTNER_TYPE_LABELS[partner.type] || partner.type;
  
  return (
    <Card className="text-center p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 relative" hoverEffect={false}>
      {partner.isFeatured && (
        <div className="absolute top-3 right-3">
          <StarIcon className="w-5 h-5 text-amber-500 fill-amber-500" />
        </div>
      )}
      <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center">
        {partner.logoUrl ? (
          <img 
            src={partner.logoUrl} 
            alt={t('partners.partnerCard.logoAlt', { name: partner.name, defaultValue: `${partner.name} logo` })} 
            className="h-full w-full object-contain grayscale hover:grayscale-0 transition-all duration-300 rounded-lg" 
          />
        ) : (
          <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
            <BuildingStorefrontIcon className="w-10 h-10 text-gray-400" />
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold text-swiss-charcoal mb-2">{partner.name}</h3>
      <p className="text-sm text-gray-600 mb-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-swiss-teal/10 text-swiss-teal">
          {typeLabel}
        </span>
      </p>
      {partner.countryRegion && (
        <p className="text-xs text-gray-500 mb-3 flex items-center justify-center gap-1">
          <GlobeAltIcon className="w-3 h-3" />
          {partner.countryRegion}
        </p>
      )}
      {partner.description && (
        <p className="text-sm text-gray-600 mb-4 h-16 overflow-hidden line-clamp-3">{partner.description}</p>
      )}
      
      {/* Contact info */}
      <div className="text-xs text-gray-500 space-y-1 mb-4">
        {partner.contactEmail && (
          <p className="flex items-center justify-center gap-1">
            <EnvelopeIcon className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{partner.contactEmail}</span>
          </p>
        )}
        {partner.contactPerson && (
          <p className="flex items-center justify-center gap-1">
            <UserIcon className="w-3 h-3" />
            {partner.contactPerson}
          </p>
        )}
      </div>
      
      {partner.websiteUrl && (
        <Button 
          variant="outline" 
          size="sm" 
          rightIcon={ArrowTopRightOnSquareIcon} 
          onClick={() => window.open(partner.websiteUrl, '_blank')}
        >
          {t('partners.partnerCard.learnMoreButton', 'Learn More')}
        </Button>
      )}
    </Card>
  );
};

const PartnersPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [featuredPartners, setFeaturedPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<PartnerType | ''>('');
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch active partners from API
      const response = await apiService.get<Partner[]>('/partners/active');
      
      if (response.data) {
        setPartners(response.data);
        // Filter featured partners
        setFeaturedPartners(response.data.filter(p => p.isFeatured));
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      setError(t('partners.error.loadFailed', 'Failed to load partners. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  // Filter partners based on search and type
  const filteredPartners = partners.filter(partner => {
    const matchesSearch = !searchQuery || 
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (partner.description && partner.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (partner.countryRegion && partner.countryRegion.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = !filterType || partner.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Get all available partner types from the data
  const availableTypes = [...new Set(partners.map(p => p.type))];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center py-20 px-6 rounded-lg overflow-hidden"
        style={{ backgroundImage: "url('https://picsum.photos/seed/swisshero/1200/400')" }}
      >
        <div className="absolute inset-0 bg-swiss-teal opacity-70"></div>
        <div className="relative z-10 text-center text-white max-w-3xl mx-auto">
          <SwissFlagIcon className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('partners.hero.title', 'Our Partners')}</h1>
          <p className="text-lg md:text-xl mb-6">
            {t('partners.hero.subtitle', 'Trusted partners in early childhood education')}
          </p>
          <Button 
            variant="primary" 
            size="lg" 
            className="bg-swiss-mint hover:bg-opacity-90 text-white"
            onClick={() => setIsApplicationModalOpen(true)}
          >
            {t('partners.hero.ctaButton', 'Become a Partner')}
          </Button>
        </div>
      </section>

      {/* Search and Filter */}
      <section>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center max-w-2xl mx-auto">
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('partners.searchPlaceholder', 'Search partners...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
            />
          </div>
          <div className="relative w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PartnerType | '')}
              className="w-full md:w-auto px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="">{t('partners.allTypes', 'All Types')}</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>{PARTNER_TYPE_LABELS[type]}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Featured Partners Section (if any) */}
      {featuredPartners.length > 0 && !searchQuery && !filterType && (
        <section>
          <h2 className="text-3xl font-semibold text-swiss-charcoal text-center mb-2">
            {t('partners.featured.title', 'Featured Partners')}
          </h2>
          <p className="text-center text-gray-600 mb-8">{t('partners.featured.subtitle', 'Leading organizations we work with')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredPartners.map(partner => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </section>
      )}

      {/* All Partners Grid */}
      <section>
        <h2 className="text-3xl font-semibold text-swiss-charcoal text-center mb-2">
          {searchQuery || filterType 
            ? t('partners.searchResults', 'Search Results') 
            : t('partners.allPartners.title', 'All Partners')}
        </h2>
        <p className="text-center text-gray-600 mb-8">
          {filteredPartners.length} {t('partners.partnersFound', 'partners found')}
        </p>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <PartnerCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchPartners}>
              {t('common:buttons.retry', 'Retry')}
            </Button>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-12">
            <BuildingStorefrontIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery || filterType 
                ? t('partners.noResults', 'No partners found matching your search')
                : t('partners.noPartners', 'No partners available yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredPartners.map(partner => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}
      </section>

      {/* Join Us / CTA Block */}
      <section className="bg-white py-16 px-6 rounded-lg shadow-lg text-center">
        <BuildingStorefrontIcon className="w-16 h-16 mx-auto mb-4 text-swiss-mint" />
        <h2 className="text-3xl font-semibold text-swiss-charcoal mb-4">{t('partners.joinUs.title', 'Become a Partner')}</h2>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          {t('partners.joinUs.subtitle', 'Join our network of trusted providers')}
        </p>
        <div className="space-x-0 space-y-3 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center items-center">
          <Button 
            variant="primary" 
            size="lg" 
            leftIcon={ChatBubbleLeftEllipsisIcon} 
            className="bg-swiss-mint hover:bg-opacity-90" 
            onClick={() => setIsApplicationModalOpen(true)}
          >
            {t('partners.joinUs.contactUsButton', 'Contact Us')}
          </Button>
          <button 
            onClick={() => setIsApplicationModalOpen(true)}
            className="text-sm text-swiss-teal hover:underline"
          >
            {t('partners.joinUs.inquiryFormLink', 'Partner Inquiry Form')}
          </button>
        </div>
      </section>

      {/* Partner Application Modal */}
      <PartnerApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
      />
    </div>
  );
};

export default PartnersPage;
