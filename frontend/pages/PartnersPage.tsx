import React, { useState, useEffect, useCallback } from 'react';
import { Partner } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { BuildingStorefrontIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { SwissFlagIcon } from '../components/icons/CustomIcons';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PartnerCard: React.FC<{ partner: Partner }> = ({ partner }) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <Card className="text-center p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105" hoverEffect={false}>
      {partner.logoUrl && (
        <img src={partner.logoUrl} alt={t('partners.partnerCard.logoAlt', { name: partner.name })} className="h-20 mx-auto mb-4 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
      )}
      <h3 className="text-xl font-semibold text-swiss-charcoal mb-2">{partner.name}</h3>
      <p className="text-sm text-gray-600 mb-1">{t('partners.partnerCard.partnerType', { type: partner.type })}</p>
      {partner.countryRegion && <p className="text-xs text-gray-500 mb-3">{partner.countryRegion}</p>}
      <p className="text-sm text-gray-600 mb-4 h-16 overflow-hidden">{partner.description}</p>
      {partner.websiteUrl && (
        <Button variant="outline" size="sm" rightIcon={ArrowTopRightOnSquareIcon} onClick={() => window.open(partner.websiteUrl, '_blank')}>
          {t('partners.partnerCard.learnMoreButton')}
        </Button>
      )}
    </Card>
  );
};

const PartnersPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { authenticatedRequest } = useAuthenticatedApi();
  
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try fetching from partners API
      const response = await authenticatedRequest<Partner[]>('/compat/partners');
      if (response.success && response.data) {
        setPartners(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      setError(t('partners.loadError', 'Failed to load partners'));
      // Keep empty array on error
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [authenticatedRequest, t]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

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

      {/* Featured Partners Grid */}
      <section>
        <h2 className="text-3xl font-semibold text-swiss-charcoal text-center mb-2">{t('partners.featured.title')}</h2>
        <p className="text-center text-gray-600 mb-8">{t('partners.featured.subtitle')}</p>
        
        {loading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPartners}>{t('common:retry', 'Retry')}</Button>
          </div>
        )}
        
        {!loading && !error && partners.length === 0 && (
          <p className="text-center text-gray-500 py-12">{t('partners.empty', 'No partners to display yet.')}</p>
        )}
        
        {!loading && !error && partners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {partners.map(partner => (
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
            <Button variant="primary" size="lg" leftIcon={ChatBubbleLeftEllipsisIcon} className="bg-swiss-mint hover:bg-opacity-90" onClick={() => alert(t('partners.joinUs.contactUsAlert'))}>
            {t('partners.joinUs.contactUsButton')}
            </Button>
            <a href="#/partner-inquiry" className="text-sm text-swiss-teal hover:underline">{t('partners.joinUs.inquiryFormLink')}</a>
        </div>
      </section>
    </div>
  );
};

export default PartnersPage;
