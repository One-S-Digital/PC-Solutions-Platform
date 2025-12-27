import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { PRICING_PLANS, APP_NAME } from '../constants';
import { UserRole, PricingPlan } from '../types';
import { useFrontendSettings } from '../hooks/useFrontendSettings';
import { usePricingTranslations } from '../hooks/usePricingTranslations';

const PricingPage: React.FC = () => {
  const { t } = useTranslation(['common', 'subscription']);
  const navigate = useNavigate();
  const { settings } = useFrontendSettings();
  const { translatePlan } = usePricingTranslations();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  // Group plans by role
  const foundationPlans = PRICING_PLANS.filter(p => p.role === UserRole.FOUNDATION);
  const supplierPlan = PRICING_PLANS.find(p => p.role === UserRole.PRODUCT_SUPPLIER);
  const serviceProviderPlan = PRICING_PLANS.find(p => p.role === UserRole.SERVICE_PROVIDER);

  const PlanCard: React.FC<{ plan: PricingPlan }> = ({ plan }) => {
    const translatedPlan = translatePlan(plan);
    const priceDisplay = billingCycle === 'monthly' 
      ? translatedPlan.monthlyPriceText 
      : translatedPlan.annualPlanText || translatedPlan.monthlyPriceText;

    return (
      <Card 
        className={`flex flex-col p-6 border-2 ${plan.isPopular ? 'border-swiss-mint shadow-xl' : 'border-gray-200'} relative`}
        hoverEffect={true}
      >
        {plan.isPopular && (
          <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase bg-swiss-mint rounded-full">
              {t('subscription:popular')}
            </span>
          </div>
        )}
        
        <h3 className="text-2xl font-bold text-swiss-charcoal text-center mt-3">
          {plan.emoji} {translatedPlan.name}
        </h3>
        
        {priceDisplay && (
          <div className="my-4 text-center">
            <p className="text-xl font-semibold text-gray-800">{priceDisplay}</p>
            {billingCycle === 'annually' && plan.price.monthly > 0 && (
              <p className="text-sm text-swiss-mint font-medium mt-1">
                {t('subscription:savePercentage', { percentage: '10%' })}
              </p>
            )}
          </div>
        )}

        {translatedPlan.tagline && (
          <p className="text-sm text-gray-600 text-center mb-2 italic">{translatedPlan.tagline}</p>
        )}

        {translatedPlan.description && (
          <p className="text-sm text-gray-700 text-center mb-4">{translatedPlan.description}</p>
        )}
        
        <ul className="space-y-3 text-sm text-gray-600 flex-grow mb-6">
          {translatedPlan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-swiss-mint mr-2 flex-shrink-0 mt-0.5" />
              <span className={`${feature.toLowerCase().includes('everything in') ? 'font-bold text-gray-800' : ''}`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
        
        <div className="mt-auto">
          <Button
            variant={plan.isPopular ? 'primary' : 'outline'}
            size="lg"
            className="w-full"
            onClick={() => navigate('/signup')}
          >
            {t('common:buttons.getStarted')}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-page-bg">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.logoAsset?.publicUrl ? (
                <img 
                  src={settings.logoAsset.publicUrl} 
                  alt={settings.siteName || APP_NAME} 
                  className="h-10 w-auto" 
                />
              ) : (
                <h1 className="text-xl font-bold text-swiss-charcoal">
                  {settings?.siteName || APP_NAME}
                </h1>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link to="/login">
                <Button variant="outline" size="sm">
                  {t('common:buttons.login')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-swiss-mint transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            {t('common:buttons.back')}
          </button>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-swiss-charcoal mb-4">
            {t('subscription:pricingTitle', 'Choose Your Plan')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subscription:pricingSubtitle', 'Select the perfect plan for your needs. All plans include our core features and dedicated support.')}
          </p>
        </div>

        {/* Daycare Plans Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-swiss-charcoal mb-2">
              {t('subscription:daycareHeader', 'For Daycare Centers')}
            </h2>
            <p className="text-gray-600">
              {t('subscription:daycareDescription', 'Comprehensive solutions for managing your daycare operations')}
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mt-6">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-swiss-charcoal' : 'text-gray-500'}`}>
                {t('subscription:monthly', 'Monthly')}
              </span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annually' : 'monthly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-2 ${
                  billingCycle === 'annually' ? 'bg-swiss-mint' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'annually' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'annually' ? 'text-swiss-charcoal' : 'text-gray-500'}`}>
                {t('subscription:annually', 'Annually')}
              </span>
              {billingCycle === 'annually' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-swiss-mint/10 text-swiss-mint">
                  {t('subscription:save10', 'Save 10%')}
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {foundationPlans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>

        {/* Supplier & Service Provider Plans Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-swiss-charcoal mb-2">
              {t('subscription:partnersHeader', 'For Suppliers & Service Providers')}
            </h2>
            <p className="text-gray-600">
              {t('subscription:partnersDescription', 'Flexible pricing based on your business needs')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {supplierPlan && <PlanCard plan={supplierPlan} />}
            {serviceProviderPlan && <PlanCard plan={serviceProviderPlan} />}
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="max-w-3xl mx-auto">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-xl font-bold text-swiss-charcoal mb-3">
              {t('subscription:needHelp', 'Need help choosing?')}
            </h3>
            <p className="text-gray-700 mb-4">
              {t('subscription:contactMessage', 'Our team is here to help you find the perfect plan for your needs. Contact us for a personalized consultation.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup">
                <Button variant="primary" size="md" className="w-full sm:w-auto">
                  {t('common:buttons.getStarted')}
                </Button>
              </Link>
              <Link to="/parent-lead-form">
                <Button variant="outline" size="md" className="w-full sm:w-auto">
                  {t('common:buttons.contactUs', 'Contact Us')}
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center text-sm text-gray-600 space-x-4">
          <Link to="/login" className="hover:text-swiss-mint transition-colors">
            {t('common:buttons.login')}
          </Link>
          <span>•</span>
          <Link to="/signup" className="hover:text-swiss-mint transition-colors">
            {t('common:buttons.signup')}
          </Link>
          <span>•</span>
          <Link to="/partners" className="hover:text-swiss-mint transition-colors">
            {t('common:partners', 'Partners')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
