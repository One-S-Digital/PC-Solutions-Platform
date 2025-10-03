import { useTranslation } from 'react-i18next';
import { PricingPlan, UserRole } from '../types';

export const usePricingTranslations = () => {
  const { t } = useTranslation();

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
      'Phone support': 'phoneSupport',
      // Supplier plan features
      'Profile + unlimited product listings': 'profileListings',
      'Structured order requests & status tracking': 'orderRequests',
      'Analytics (views, clicks, orders)': 'analytics',
      'Promo codes & redemption tracking': 'promoCodes',
      'Full visibility across all daycares': 'fullVisibility',
      'Email support & guided onboarding': 'emailSupportOnboarding',
      // Service provider plan features
      'Profile + multi-service listings': 'profileServices',
      'Appointment & quote requests': 'appointmentRequests',
      'Scheduling link integration (Calendly/Cal.com)': 'scheduling',
      'Pipeline management tools': 'pipelineTools',
      'Promo code options': 'promoOptions'
    };
    
    return featureMap[feature] || 'default';
  };

  // Translate a pricing plan with proper formatting
  const translatePlan = (plan: PricingPlan, isAnnual: boolean = false): PricingPlan => {
    const planKey = plan.name.toLowerCase();
    
    if (plan.role === UserRole.FOUNDATION) {
      const translationKey = `${planKey}Plan`;
      const displayPrice = isAnnual ? plan.price.annualEquivalent : plan.price.monthly;
      const priceLabel = isAnnual ? t('common.perMonth') : t('common.perMonth');
      
      return {
        ...plan,
        name: t(`pricingPage.${translationKey}.name`, plan.name),
        monthlyPriceText: `CHF ${displayPrice || plan.price.monthly} ${priceLabel}`,
        annualPlanText: `CHF ${plan.price.annually} ${t('common.perYear')} (${t('common.save10Percent')})`,
        tagline: t(`pricingPage.${translationKey}.tagline`, plan.tagline),
        description: t(`pricingPage.${translationKey}.description`, plan.description),
        features: plan.features.map(feature => 
          t(`pricingPage.${translationKey}.features.${getFeatureKey(feature)}`, feature)
        )
      };
    } else {
      // For supplier and service provider plans
      const baseKey = plan.role === UserRole.PRODUCT_SUPPLIER ? 'suppliersPlan' : 'serviceProviderPlan';
      const displayPrice = isAnnual ? plan.price.annualEquivalent : plan.price.monthly;
      const priceLabel = isAnnual ? t('common.perMonth') : t('common.perMonth');
      
      return {
        ...plan,
        name: t(`pricingPage.${baseKey}.name`, plan.name),
        monthlyPriceText: `CHF ${displayPrice || plan.price.monthly} ${priceLabel}`,
        annualPlanText: `CHF ${plan.price.annually} ${t('common.perYear')} (${t('common.save10Percent')})`,
        tagline: t(`pricingPage.${baseKey}.tagline`, plan.tagline),
        description: t(`pricingPage.${baseKey}.description`, plan.description),
        features: plan.features.map(feature => 
          t(`pricingPage.${baseKey}.features.${getFeatureKey(feature)}`, feature)
        )
      };
    }
  };

  // Translate a formatted price string
  const translatePrice = (monthlyPrice: number, annualPrice: number) => ({
    monthly: `CHF ${monthlyPrice} ${t('common.perMonth')}`,
    annual: `CHF ${annualPrice} ${t('common.perYear')} (${t('common.save10Percent')})`
  });

  // Translate pricing text like "/month", "/year", "(save 10%)"
  const translatePriceFormatting = () => ({
    perMonth: t('common.perMonth'),
    perYear: t('common.perYear'),
    save10Percent: t('common.save10Percent')
  });

  return {
    translatePlan,
    translatePrice,
    translatePriceFormatting,
    getFeatureKey,
    t // Re-export translation function for direct use
  };
};
