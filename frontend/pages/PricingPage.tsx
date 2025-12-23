
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { PricingPlan, UserRole, SubscriptionTier } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PricingToggle from '../components/ui/PricingToggle';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { ArrowLeftIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { pricingService } from '../services/pricingService';
import { usePricingTranslations } from '../hooks/usePricingTranslations';
import { useFrontendSettings } from '../hooks/useFrontendSettings';
import { APP_NAME } from '../constants';
import SubscriptionRequestModal, { SubscriptionRequestFormData } from '../components/shared/SubscriptionRequestModal';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiService } from '../services/api';
import type { SubscriptionPlan } from '../contexts/SubscriptionContext';

const PricingPage: React.FC = () => {
  const { t } = useTranslation(['pricing', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { requestSubscription } = useSubscription();
  const { translatePlan } = usePricingTranslations();
  const { settings } = useFrontendSettings();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubscriptionPlans, setActiveSubscriptionPlans] = useState<SubscriptionPlan[]>([]);

  const fromSignup = location.state?.fromSignup || false;
  const userRoleFromSignup = location.state?.role as UserRole | undefined;

  const { foundation: daycarePlans, supplier: supplierPlan, serviceProvider: serviceProviderPlan } = pricingService.getPlansByRole();

  // Fetch backend subscription plans so the request payload has a real `planId`
  useEffect(() => {
    let isMounted = true;
    apiService
      .get<SubscriptionPlan[]>('/subscriptions/plans')
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && Array.isArray(res.data)) {
          setActiveSubscriptionPlans(res.data);
        }
      })
      .catch(() => {
        // Best-effort only: UI can still render prices from PRICING_PLANS.
        // Submission will show a friendly error if planId is missing.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChoosePlan = (plan: PricingPlan) => {
    // If user is logged in, show the request modal
    if (currentUser) {
      setSelectedPlan(plan);
      setIsRequestModalOpen(true);
    } else if (fromSignup) {
      // Coming from signup flow - open request modal
      setSelectedPlan(plan);
      setIsRequestModalOpen(true);
    } else {
      // Not logged in - redirect to signup
      navigate('/signup', { state: { selectedPlan: plan.name } });
    }
  };

  const handleSubmitRequest = async (data: SubscriptionRequestFormData) => {
    setIsSubmitting(true);
    try {
      await requestSubscription({
        planId: data.planId,
        tier: data.tier,
        billingPeriod: data.billingPeriod,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        preferredContact: data.preferredContact,
        message: data.message,
        organizationId: data.organizationId,
      });
    } catch (error) {
      // Re-throw to let the modal handle and display the error
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanTier = (plan: PricingPlan): SubscriptionTier => {
    // Map plan names to tiers
    const tierMap: Record<string, SubscriptionTier> = {
      'Essential': SubscriptionTier.ESSENTIAL,
      'Professional': SubscriptionTier.PROFESSIONAL,
      'Enterprise': SubscriptionTier.ENTERPRISE,
      'Basic': SubscriptionTier.BASIC,
    };
    return tierMap[plan.name] || SubscriptionTier.BASIC;
  };

  const activePlanIdByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of activeSubscriptionPlans) {
      if (p?.code && p?.id) {
        map.set(String(p.code).toUpperCase(), p.id);
      }
    }
    return map;
  }, [activeSubscriptionPlans]);

  const resolveSubscriptionPlanId = (plan: PricingPlan): string | undefined => {
    // Prefer matching by backend plan name (works for Suppliers/Service Providers too).
    const normalized = (plan.name || '').trim().toLowerCase();
    const byName = activeSubscriptionPlans.find(
      (p) => (p?.name || '').trim().toLowerCase() === normalized
    );
    if (byName?.id) return byName.id;

    // Fallback for foundation plans that follow tier codes.
    const tier = getPlanTier(plan);
    return activePlanIdByCode.get(String(tier).toUpperCase());
  };


  const PlanCard: React.FC<{ plan: PricingPlan }> = ({ plan }) => {
    const translatedPlan = translatePlan(plan, isAnnual);
    
    return (
      <Card className={`flex flex-col p-6 border-2 ${plan.isPopular ? 'border-swiss-mint' : 'border-gray-200'} relative`} hoverEffect>
        {plan.isPopular && (
          <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase bg-swiss-mint rounded-full">{t('pricingPage.popular')}</span>
          </div>
        )}
        <h3 className="text-2xl font-bold text-swiss-charcoal text-center mt-3">{plan.emoji} {translatedPlan.name}</h3>
        
        {(translatedPlan.monthlyPriceText || translatedPlan.annualPlanText) && (
          <div className="my-4 text-center space-y-1">
            {translatedPlan.monthlyPriceText && (
              <p className="text-xl font-semibold text-gray-800">{translatedPlan.monthlyPriceText}</p>
            )}
            {translatedPlan.annualPlanText && (
              <p className="text-sm text-gray-600">{translatedPlan.annualPlanText}</p>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 text-center font-medium my-2">{translatedPlan.tagline}</p>
        <p className="text-sm text-gray-600 text-center my-4">{translatedPlan.description}</p>

        <p className="font-semibold text-swiss-charcoal mb-3">{t('pricingPage.whatYouGet')}:</p>
        <ul className="space-y-3 text-sm text-gray-600 flex-grow">
          {translatedPlan.features.map(feature => (
            <li key={feature} className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-swiss-mint mr-2 flex-shrink-0 mt-0.5" />
              <span className={`${feature.toLowerCase().includes('everything in') ? 'font-bold text-gray-800' : ''}`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
        <Button
          variant={plan.isPopular ? 'primary' : 'outline'}
          size="lg"
          className="w-full mt-6"
          onClick={() => handleChoosePlan(plan)}
        >
          {plan.role === UserRole.PRODUCT_SUPPLIER || plan.role === UserRole.SERVICE_PROVIDER
            ? t('pricingPage.enquireButton')
            : (fromSignup ? t('pricingPage.selectAndContinue') : t('pricingPage.choosePlan'))}
        </Button>
      </Card>
    );
  };

  const shouldShowDaycare = !fromSignup || userRoleFromSignup === UserRole.FOUNDATION;
  const shouldShowSuppliersAndProviders = !fromSignup || userRoleFromSignup === UserRole.PRODUCT_SUPPLIER || userRoleFromSignup === UserRole.SERVICE_PROVIDER;


  return (
    <div className="bg-page-bg min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative text-swiss-charcoal">
       <div className="absolute top-0 left-0 w-full p-4 sm:p-6 lg:p-8 flex justify-between items-center z-10">
        <Link to="/login" className="flex items-center space-x-2 text-swiss-charcoal hover:text-swiss-teal transition-colors">
            {settings?.logoAsset?.publicUrl ? (
              <img 
                src={settings.logoAsset.publicUrl} 
                alt={settings.siteName || APP_NAME} 
                className="h-10 w-auto" 
              />
            ) : (
              <SquaresPlusIcon className="h-8 w-8 text-swiss-mint" />
            )}
        </Link>
        <Button variant="light" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon}>
            {t('common:buttons.goBack')}
        </Button>
      </div>

      <div className="max-w-7xl mx-auto pt-16 sm:pt-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-swiss-charcoal">{fromSignup ? t('pricingPage.titleSignup') : t('pricingPage.title')}</h1>
          <p className="mt-3 text-lg text-gray-600">{fromSignup ? t('pricingPage.subtitleSignup') : t('pricingPage.subtitle')}</p>
        </div>
        
        {/* Pricing Toggle */}
        <div className="flex justify-center mt-8">
          <PricingToggle 
            isAnnual={isAnnual} 
            onToggle={setIsAnnual} 
            className="mx-4"
          />
        </div>
        
        {shouldShowDaycare && (
            <div className="mt-12">
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {daycarePlans.map(plan => <PlanCard key={plan.name} plan={plan} />)}
                </div>
            </div>
        )}
        
        {shouldShowSuppliersAndProviders && (
             <div className="mt-16">
                <h2 className="text-3xl font-semibold text-center text-swiss-charcoal">{t('pricingPage.suppliersAndProvidersTitle')}</h2>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {supplierPlan && <PlanCard plan={supplierPlan} />}
                {serviceProviderPlan && <PlanCard plan={serviceProviderPlan} />}
                </div>
            </div>
        )}

      </div>

      {/* Subscription Request Modal */}
      {selectedPlan && (
        <SubscriptionRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
          billingPeriod={isAnnual ? 'yearly' : 'monthly'}
          tier={getPlanTier(selectedPlan)}
          subscriptionPlanId={resolveSubscriptionPlanId(selectedPlan)}
          onSubmit={handleSubmitRequest}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default PricingPage;
