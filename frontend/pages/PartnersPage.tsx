import React, { useState, useEffect } from 'react';
import { Partner, PARTNER_TYPE_LABELS, PartnerType } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { BuildingStorefrontIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftEllipsisIcon, GlobeAltIcon, EnvelopeIcon, PhoneIcon, UserIcon, StarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SwissFlagIcon } from '../components/icons/CustomIcons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

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
            alt={t('partners.partnerCard.logoAlt', { name: partner.name })} 
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
          {t('partners.partnerCard.learnMoreButton')}
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
      setError('Failed to load partners. Please try again later.');
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('partners.hero.title')}</h1>
          <p className="text-lg md:text-xl mb-6">
            {t('partners.hero.subtitle')}
          </p>
          <Button variant="primary" size="lg" className="bg-swiss-mint hover:bg-opacity-90 text-white">
            {t('partners.hero.ctaButton')}
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
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as PartnerType | '')}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
          >
            <option value="">{t('partners.allTypes', 'All Types')}</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{PARTNER_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Featured Partners Section (if any) */}
      {featuredPartners.length > 0 && !searchQuery && !filterType && (
        <section>
          <h2 className="text-3xl font-semibold text-swiss-charcoal text-center mb-2">
            {t('partners.featured.title')}
          </h2>
          <p className="text-center text-gray-600 mb-8">{t('partners.featured.subtitle')}</p>
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
              {t('common:retry', 'Retry')}
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
        <h2 className="text-3xl font-semibold text-swiss-charcoal mb-4">{t('partners.joinUs.title')}</h2>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          {t('partners.joinUs.subtitle')}
        </p>
        <div className="space-x-0 space-y-3 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center items-center">
          <Button 
            variant="primary" 
            size="lg" 
            leftIcon={ChatBubbleLeftEllipsisIcon} 
            className="bg-swiss-mint hover:bg-opacity-90" 
            onClick={() => alert(t('partners.joinUs.contactUsAlert'))}
          >
            {t('partners.joinUs.contactUsButton')}
          </Button>
          <a href="#/partner-inquiry" className="text-sm text-swiss-teal hover:underline">
            {t('partners.joinUs.inquiryFormLink')}
          </a>
        </div>
      </section>
    </div>
  );
};

export default PartnersPage;
