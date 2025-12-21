import { useTranslation } from 'react-i18next';
import { PricingPlan, UserRole } from '../types';

export const usePricingTranslations = () => {
  const { t } = useTranslation(['pricing', 'common']);

  const translatePricingKey = (key: string) => {
    const namespacedKey = `pricingPage.${key}`;
    const value = t(namespacedKey);
    return value === namespacedKey ? '' : value;
  };

  const normalizePlanName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char: string) => char.toUpperCase())
      .replace(/[^a-z0-9]/g, '');

  // Helper function to convert feature text to translation key
  const getFeatureKey = (feature: string) => {
    const featureMap: { [key: string]: string } = {
      'Supplier & service provider marketplace': 'marketplace',
      'State policy hub (by canton)': 'policyhub',
      'Multilingual interface (EN/FR/DE)': 'multilingual',
      'Email support': 'emailSupport',
      'Everything in Basic': 'everythingBasic',
      'Parent leads inbox + auto-matching system': 'leadInbox',
      'HR & compliance document library (Swiss-validated)': 'hrCompliance',
      'Parent enquiry tracker with quick replies': 'enquiryTracker',
      'Everything in Essential': 'everythingEssential',
      'Recruitment module': 'recruitment',
      'Unlimited parent enquiries': 'unlimitedEnquiries',
      'E-learning for staff': 'elearning',
      'Team management & tools': 'teamTools',
      'Priority support': 'prioritySupport',
      'Phone support': 'phoneSupport',
      'Everything in Professional': 'everythingProfessional',
      'Multi-site management': 'multiSiteManagement',
      'Advanced analytics & reporting': 'advancedAnalytics',
      'Dedicated account manager': 'accountManager',
      'Custom integrations & API access': 'customIntegrations',
      'White-label branding options': 'whiteLabelBranding',
      // Supplier plan features
      'Profile + unlimited product listings': 'profileListings',
      'Structured order requests & status tracking': 'orderRequests',
      'Analytics (views, clicks, orders)': 'analytics',
      'Promo codes & redemption tracking': 'promoCodes',
      'Full visibility across all daycares': 'fullVisibility',
      'Email support & guided onboarding': 'emailSupportOnboarding',
      'Product listings & marketplace access': 'productListings',
      'Lead management system': 'leadManagement',
      'Order tracking & fulfillment': 'orderTracking',
      'Multi-language support': 'multiLanguageSupport',
      'Sales analytics dashboard': 'salesAnalytics',
      // Service provider plan features
      'Profile + multi-service listings': 'profileServices',
      'Appointment & quote requests': 'appointmentRequests',
      'Scheduling link integration (Calendly/Cal.com)': 'scheduling',
      'Pipeline management tools': 'pipelineTools',
      'Promo code options': 'promoOptions',
      'Service listings & marketplace access': 'serviceListings',
      'Appointment scheduling system': 'appointmentScheduling',
      'Client relationship management': 'crm',
      'Revenue tracking & reporting': 'revenueTracking'
    };
    
    return featureMap[feature] || 'default';
  };

  // Translate a pricing plan with proper formatting
  const translatePlan = (plan: PricingPlan, isAnnual: boolean = false): PricingPlan => {
    const planKey = normalizePlanName(plan.name);
    
    if (plan.role === UserRole.FOUNDATION) {
      const translationKey = `${planKey}Plan`;
      const displayPrice = isAnnual ? plan.price.annualEquivalent : plan.price.monthly;
      const priceLabel = t('common:common.perMonth');

      return {
        ...plan,
        name: translatePricingKey(`${translationKey}.name`) || plan.name,
        monthlyPriceText: `CHF ${displayPrice || plan.price.monthly} ${priceLabel}`,
        annualPlanText: `CHF ${plan.price.annually} ${t('common:common.perYear')} (${t('common:common.save10Percent')})`,
        tagline: translatePricingKey(`${translationKey}.tagline`) || plan.tagline,
        description: translatePricingKey(`${translationKey}.description`) || plan.description,
        features: plan.features.map(feature => {
          const translatedFeature = translatePricingKey(`${translationKey}.features.${getFeatureKey(feature)}`);
          return translatedFeature || feature;
        })
      };
    } else {
      // For supplier and service provider plans
      const baseKey = plan.role === UserRole.PRODUCT_SUPPLIER ? 'suppliersPlan' : 'serviceProviderPlan';
      // Prices are not displayed for these roles (enquiry-only)

      return {
        ...plan,
        name: translatePricingKey(`${baseKey}.name`) || plan.name,
        monthlyPriceText: '',
        annualPlanText: '',
        tagline: translatePricingKey(`${baseKey}.tagline`) || plan.tagline,
        description: translatePricingKey(`${baseKey}.description`) || plan.description,
        features: plan.features.map(feature => {
          const translatedFeature = translatePricingKey(`${baseKey}.features.${getFeatureKey(feature)}`);
          return translatedFeature || feature;
        })
      };
    }
  };

  // Translate a formatted price string
  const translatePrice = (monthlyPrice: number, annualPrice: number) => ({
    monthly: `CHF ${monthlyPrice} ${t('common:common.perMonth')}`,
    annual: `CHF ${annualPrice} ${t('common:common.perYear')} (${t('common:common.save10Percent')})`
  });

  // Translate pricing text like "/month", "/year", "(save 10%)"
  const translatePriceFormatting = () => ({
    perMonth: t('common:common.perMonth'),
    perYear: t('common:common.perYear'),
    save10Percent: t('common:common.save10Percent')
  });

  return {
    translatePlan,
    translatePrice,
    translatePriceFormatting,
    getFeatureKey,
    t // Re-export translation function for direct use
  };
};
