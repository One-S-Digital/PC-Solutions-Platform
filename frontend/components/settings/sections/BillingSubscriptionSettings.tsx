
import React from 'react';
import { SettingsFormData, UserRole, PricingPlan } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import { WalletIcon, CreditCardIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { pricingService } from '../../../services/pricingService';
import { usePricingTranslations } from '../../../hooks/usePricingTranslations';

interface BillingSubscriptionSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PlanCard: React.FC<{ plan: PricingPlan, currentPlanName?: string, onSelectPlan: (planName: string) => void }> = ({ plan, currentPlanName, onSelectPlan }) => {
    const { t } = useTranslation();
    const { translatePlan } = usePricingTranslations();
    const translatedPlan = translatePlan(plan);
    const isCurrentPlan = plan.name === currentPlanName;
    const planOrder = { 'Basic': 1, 'Essential': 2, 'Professional': 3 };
    const currentPlanOrder = planOrder[currentPlanName as keyof typeof planOrder] || 0;
    const thisPlanOrder = planOrder[plan.name as keyof typeof planOrder];
    
    let actionButton;
    if (isCurrentPlan) {
        actionButton = <Button variant="secondary" size="md" className="w-full" disabled>{t('settingsBillingSubscription.yourCurrentPlan')}</Button>;
    } else if (thisPlanOrder > currentPlanOrder) {
        actionButton = <Button variant="primary" size="md" className="w-full" onClick={() => onSelectPlan(plan.name)}>{t('settingsBillingSubscription.upgradePlan')}</Button>;
    } else {
        actionButton = <Button variant="outline" size="md" className="w-full" onClick={() => onSelectPlan(plan.name)}>{t('settingsBillingSubscription.downgradePlan')}</Button>;
    }

    return (
        <Card className={`flex flex-col p-6 border-2 ${isCurrentPlan ? 'border-swiss-mint shadow-lg' : 'border-gray-200'} relative`} hoverEffect={!isCurrentPlan}>
             {isCurrentPlan && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase bg-swiss-mint rounded-full">{t('settingsBillingSubscription.yourCurrentPlan')}</span>
                </div>
            )}
            <h3 className="text-2xl font-bold text-swiss-charcoal text-center mt-3">{plan.emoji} {translatedPlan.name}</h3>
            <div className="my-4 text-center space-y-1">
                <p className="text-xl font-semibold text-gray-800">{translatedPlan.monthlyPriceText}</p>
                <p className="text-sm text-gray-600">{translatedPlan.annualPlanText}</p>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 flex-grow mb-6">
                {translatedPlan.features.map(feature => (
                    <li key={feature} className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 text-swiss-mint mr-2 flex-shrink-0 mt-0.5" />
                        <span className={`${feature.toLowerCase().includes('everything in') ? 'font-bold text-gray-800' : ''}`}>{feature}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-auto">
                {actionButton}
            </div>
        </Card>
    );
};


const BillingSubscriptionSettings: React.FC<BillingSubscriptionSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  
  const handleSelectPlan = (planName: string) => {
      // In a real app, this would redirect to a checkout/confirmation page
      alert(`Plan selected: ${planName}. This would typically lead to a payment confirmation flow.`);
  };

  const foundationPlans = pricingService.getFoundationPlans();

  if (userRole !== UserRole.FOUNDATION) {
    // Render simplified version for other roles
    return (
        <SettingsSectionWrapper title={t('settingsPage.billingSubscription')} icon={WalletIcon}>
             <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="text-md font-medium text-gray-700">{t('settingsBillingSubscription.currentPlan')}</h3>
                <p className="text-2xl font-semibold text-swiss-mint mt-1">{settings.currentTier || 'N/A'}</p>
                 {settings.nextInvoiceDate && <p className="text-sm text-gray-500 mt-0.5">{t('settingsBillingSubscription.nextInvoiceOn', { date: new Date(settings.nextInvoiceDate).toLocaleDateString() })}</p>}
            </div>
        </SettingsSectionWrapper>
    );
  }

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {foundationPlans.map(plan => (
                <PlanCard key={plan.name} plan={plan} currentPlanName={settings.currentTier} onSelectPlan={handleSelectPlan} />
            ))}
        </div>

        <Card className="p-6">
            <h3 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('settingsBillingSubscription.manageSubscriptionTitle')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('settingsBillingSubscription.manageSubscriptionDescription')}</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                    variant="secondary" 
                    leftIcon={CreditCardIcon} 
                    onClick={() => window.open(settings.stripePortalLink || '#', '_blank')}
                    disabled={!settings.stripePortalLink}
                >
                    {t('settingsBillingSubscription.managePaymentButton')}
                </Button>
                 <Button 
                    variant="danger" 
                    leftIcon={XCircleIcon}
                    onClick={() => setIsCancelModalOpen(true)}
                >
                    {t('settingsBillingSubscription.cancelSubscription')}
                </Button>
            </div>
             {!settings.stripePortalLink && <p className="text-xs text-gray-400 mt-2">{t('settingsBillingSubscription.stripePortalLinkNotConfigured')}</p>}
        </Card>

        {isCancelModalOpen && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-2 text-swiss-coral">{t('settingsBillingSubscription.confirmCancelTitle')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('settingsBillingSubscription.confirmCancelMessage')}</p>
                  <div className="flex justify-end space-x-2">
                      <Button variant="light" onClick={() => setIsCancelModalOpen(false)}>{t('settingsBillingSubscription.keepSubscription')}</Button>
                      <Button variant="danger" onClick={() => alert('Subscription cancelled (mock action)')}>{t('settingsBillingSubscription.yesCancel')}</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BillingSubscriptionSettings;
