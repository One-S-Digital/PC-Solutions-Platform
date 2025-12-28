import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Partner, PARTNER_TYPE_LABELS, PartnerType } from '../types';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useFrontendSettings } from '../hooks/useFrontendSettings';
import { APP_NAME } from '../constants';
import { useAppContext } from '../contexts/AppContext';
import { getHomePath } from '../utils/navigation';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import {
  BuildingStorefrontIcon,
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  SparklesIcon,
  HandshakeIcon,
  HeartIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { SwissFlagIcon } from '../components/icons/CustomIcons';

// Animated gradient background component
const AnimatedBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-swiss-mint/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-swiss-teal/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-swiss-sand/10 to-swiss-coral/5 rounded-full blur-3xl" />
  </div>
);

// Loading skeleton component with shimmer effect
const PartnerCardSkeleton: React.FC = () => (
  <div className="group relative bg-white rounded-2xl overflow-hidden shadow-soft">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 bg-gray-200 rounded-full w-16" />
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>
    </div>
  </div>
);

// Partner card component with dynamic hover effects
const PartnerCard: React.FC<{ partner: Partner; index: number }> = ({ partner, index }) => {
  const { t } = useTranslation(['admin', 'common']);
  const typeLabel = PARTNER_TYPE_LABELS[partner.type] || partner.type;

  // Staggered animation delay based on index
  const animationDelay = `${index * 75}ms`;

  const getTypeColor = (type: PartnerType) => {
    const colors: Record<PartnerType, string> = {
      ACADEMIC: 'from-blue-500 to-indigo-600',
      CORPORATE: 'from-slate-600 to-slate-800',
      GOVERNMENTAL: 'from-amber-500 to-orange-600',
      NON_PROFIT: 'from-rose-500 to-pink-600',
      MEDIA: 'from-purple-500 to-violet-600',
      TECHNOLOGY: 'from-swiss-teal to-cyan-600',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getTypeBgColor = (type: PartnerType) => {
    const colors: Record<PartnerType, string> = {
      ACADEMIC: 'bg-blue-50 text-blue-700 border-blue-200',
      CORPORATE: 'bg-slate-50 text-slate-700 border-slate-200',
      GOVERNMENTAL: 'bg-amber-50 text-amber-700 border-amber-200',
      NON_PROFIT: 'bg-rose-50 text-rose-700 border-rose-200',
      MEDIA: 'bg-purple-50 text-purple-700 border-purple-200',
      TECHNOLOGY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-xl transition-all duration-500 ease-out transform hover:-translate-y-2 opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
      style={{ animationDelay }}
    >
      {/* Gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getTypeColor(partner.type)} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
      
      {/* Featured badge */}
          {partner.isFeatured && (
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-lg">
                <StarIconSolid className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-semibold text-white">{t('admin:partners.publicPage.featured')}</span>
              </div>
            </div>
          )}

      <div className="p-6">
        {/* Header with logo and name */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className={`absolute inset-0 bg-gradient-to-br ${getTypeColor(partner.type)} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`} />
            {partner.logoUrl ? (
              <img
                src={partner.logoUrl}
                alt={partner.name}
                className="relative w-16 h-16 object-contain rounded-xl bg-gray-50 p-2 ring-1 ring-gray-100 group-hover:ring-2 group-hover:ring-swiss-mint/50 transition-all duration-300"
              />
            ) : (
              <div className={`relative w-16 h-16 rounded-xl bg-gradient-to-br ${getTypeColor(partner.type)} flex items-center justify-center`}>
                <BuildingStorefrontIcon className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-swiss-charcoal group-hover:text-swiss-teal transition-colors duration-300 truncate">
              {partner.name}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 text-xs font-medium rounded-full border ${getTypeBgColor(partner.type)}`}>
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Location */}
        {partner.countryRegion && (
          <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
            <GlobeAltIcon className="w-4 h-4" />
            <span>{partner.countryRegion}</span>
          </div>
        )}

        {/* Description */}
        {partner.description && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {partner.description}
          </p>
        )}

        {/* Contact info - revealed on hover */}
        <div className="mt-4 space-y-1.5 overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-500 ease-out">
          {partner.contactEmail && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <EnvelopeIcon className="w-4 h-4 text-swiss-mint" />
              <span className="truncate">{partner.contactEmail}</span>
            </div>
          )}
          {partner.contactPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <PhoneIcon className="w-4 h-4 text-swiss-mint" />
              <span>{partner.contactPhone}</span>
            </div>
          )}
          {partner.contactPerson && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <UserIcon className="w-4 h-4 text-swiss-mint" />
              <span>{partner.contactPerson}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        {partner.websiteUrl && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={partner.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-swiss-teal bg-swiss-teal/5 rounded-xl hover:bg-swiss-teal hover:text-white transition-all duration-300 group/btn"
            >
              <span>{t('admin:partners.publicPage.visitWebsite')}</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-2 transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Filter chip component
const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}> = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
      active
        ? 'bg-swiss-teal text-white shadow-lg shadow-swiss-teal/25'
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-swiss-teal/30'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
        {count}
      </span>
    )}
  </button>
);

// Stats card component
const StatCard: React.FC<{
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
}> = ({ icon: Icon, value, label, color }) => (
  <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-soft group hover:shadow-lg transition-all duration-300">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${color} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
    <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')} mb-3`} />
    <div className="text-3xl font-bold text-swiss-charcoal">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
);

const PublicPartnersPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { settings, loading: settingsLoading } = useFrontendSettings();
  const { currentUser } = useAppContext();
  const homePath = getHomePath(currentUser);
  const logoUrl = settings?.logoAsset?.publicUrl;
  const showLogoFallback = !settingsLoading && !logoUrl;
  
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<PartnerType | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get<Partner[]>('/partners/active');
      if (response.data) {
        setPartners(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      setError('Failed to load partners. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Filter partners
  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesSearch =
        !searchQuery ||
        partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (partner.description && partner.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (partner.countryRegion && partner.countryRegion.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = !filterType || partner.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [partners, searchQuery, filterType]);

  // Get featured partners
  const featuredPartners = useMemo(() => {
    return filteredPartners.filter((p) => p.isFeatured);
  }, [filteredPartners]);

  // Get type counts
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<PartnerType, number>> = {};
    partners.forEach((p) => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });
    return counts;
  }, [partners]);

  // Get available types
  const availableTypes = useMemo(() => {
    return [...new Set(partners.map((p) => p.type))];
  }, [partners]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-bg via-white to-page-bg">
      {/* Add shimmer keyframe animation */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={homePath} className="flex items-center space-x-3 group" aria-label={t('common:buttons.goHome', 'Go to home')}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={settings?.siteName || APP_NAME}
                  className="h-10 w-auto"
                />
              ) : showLogoFallback ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-swiss-mint to-swiss-teal flex items-center justify-center">
                    <SwissFlagIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-swiss-charcoal">{APP_NAME}</span>
                </div>
              ) : (
                <span className="h-10 w-10" aria-hidden="true" />
              )}
            </Link>

            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-swiss-teal hover:text-swiss-charcoal transition-colors"
              >
                {t('admin:partners.publicPage.signIn')}
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-swiss-mint to-swiss-teal rounded-xl hover:shadow-lg hover:shadow-swiss-mint/25 transition-all duration-300"
              >
                {t('admin:partners.publicPage.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <AnimatedBackground />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-swiss-mint/10 rounded-full mb-6">
              <SparklesIcon className="w-5 h-5 text-swiss-mint" />
              <span className="text-sm font-semibold text-swiss-teal">{t('admin:partners.publicPage.trustedBy')}</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold text-swiss-charcoal leading-tight">
              {t('admin:partners.publicPage.heroTitle').split(' ').slice(0, -1).join(' ')}{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-swiss-mint to-swiss-teal bg-clip-text text-transparent">
                  {t('admin:partners.publicPage.heroTitle').split(' ').slice(-1)[0]}
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-swiss-sand" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <path d="M0 6 Q 25 0, 50 6 T 100 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              {t('admin:partners.publicPage.heroSubtitle')}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              <StatCard
                icon={BuildingStorefrontIcon}
                value={partners.length || '50+'}
                label={t('admin:partners.publicPage.stats.partners')}
                color="bg-swiss-mint"
              />
              <StatCard
                icon={GlobeAltIcon}
                value="26"
                label={t('admin:partners.publicPage.stats.cantonsCovered')}
                color="bg-swiss-teal"
              />
              <StatCard
                icon={HeartIcon}
                value="1000+"
                label={t('admin:partners.publicPage.stats.daycaresServed')}
                color="bg-swiss-coral"
              />
              <StatCard
                icon={StarIcon}
                value="4.9"
                label={t('admin:partners.publicPage.stats.averageRating')}
                color="bg-swiss-sand"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="relative z-10 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search input */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin:partners.publicPage.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-swiss-mint focus:border-transparent transition-all duration-300 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Filter toggle button for mobile */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span>{t('admin:partners.publicPage.filters')}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Filter chips */}
            <div className={`flex flex-wrap gap-2 mt-4 ${showFilters ? '' : 'hidden md:flex'}`}>
              <FilterChip
                label={t('admin:partners.publicPage.allPartners')}
                active={filterType === ''}
                onClick={() => setFilterType('')}
                count={partners.length}
              />
              {availableTypes.map((type) => (
                <FilterChip
                  key={type}
                  label={PARTNER_TYPE_LABELS[type]}
                  active={filterType === type}
                  onClick={() => setFilterType(type === filterType ? '' : type)}
                  count={typeCounts[type]}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Partners Section */}
      {featuredPartners.length > 0 && !searchQuery && !filterType && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500">
                <StarIconSolid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-swiss-charcoal">{t('admin:partners.publicPage.featuredTitle')}</h2>
                <p className="text-sm text-gray-500">{t('admin:partners.publicPage.featuredSubtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPartners.map((partner, index) => (
                <PartnerCard key={partner.id} partner={partner} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Partners Section */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-swiss-charcoal">
                {searchQuery || filterType ? t('admin:partners.searchResults') : t('admin:partners.publicPage.allPartnersTitle')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredPartners.length} {t('admin:partners.partnersFound')}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <PartnerCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <XMarkIcon className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchPartners}>
                {t('common:buttons.retry', 'Try Again')}
              </Button>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin:partners.publicPage.noPartnersFound')}</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterType
                  ? t('admin:partners.publicPage.tryAdjustingFilters')
                  : t('admin:partners.publicPage.noPartnersAvailable')}
              </p>
              {(searchQuery || filterType) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('');
                  }}
                >
                  {t('admin:partners.publicPage.clearFilters')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners.map((partner, index) => (
                <PartnerCard key={partner.id} partner={partner} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-swiss-teal to-swiss-mint opacity-95" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-6">
            <BuildingStorefrontIcon className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-4">
            {t('admin:partners.publicPage.becomePartnerTitle')}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {t('admin:partners.publicPage.becomePartnerSubtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-swiss-teal font-semibold rounded-xl hover:bg-gray-50 hover:shadow-xl transition-all duration-300"
            >
              {t('admin:partners.publicPage.applyButton')}
              <ArrowTopRightOnSquareIcon className="w-5 h-5 ml-2" />
            </Link>
            <a
              href="mailto:partners@procrechesolutions.com"
              className="inline-flex items-center px-8 py-4 border-2 border-white/50 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              <EnvelopeIcon className="w-5 h-5 mr-2" />
              {t('admin:partners.publicPage.contactUs')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-swiss-charcoal text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Link to={homePath} className="flex items-center gap-3" aria-label={t('common:buttons.goHome', 'Go to home')}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={settings?.siteName || APP_NAME}
                    className="h-8 w-auto brightness-0 invert"
                  />
                ) : showLogoFallback ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-swiss-mint flex items-center justify-center">
                      <SwissFlagIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold">{APP_NAME}</span>
                  </div>
                ) : (
                  <span className="h-8 w-8" aria-hidden="true" />
                )}
              </Link>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <Link to="/pricing" className="hover:text-white transition-colors">{t('admin:partners.publicPage.pricing')}</Link>
              <Link to="/login" className="hover:text-white transition-colors">{t('admin:partners.publicPage.signIn')}</Link>
              <Link to="/signup" className="hover:text-white transition-colors">{t('admin:partners.publicPage.getStarted')}</Link>
            </div>
            
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {settings?.siteName || APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPartnersPage;
