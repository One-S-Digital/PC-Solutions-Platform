
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WalletIcon, CreditCardIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { SettingsFormData, UserRole, PricingPlan } from '../../../types';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import { pricingService } from '../../../services/pricingService';
import { usePricingTranslations } from '../../../hooks/usePricingTranslations';

interface BillingSubscriptionSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PlanCard: React.FC<{ plan: PricingPlan, currentPlanName?: string, onSelectPlan: (planName: string) => void }> = ({ plan, currentPlanName, onSelectPlan }) => {
    const { t, i18n } = useTranslation(['dashboard', 'common']);
    const { translatePlan } = usePricingTranslations();
    const translatedPlan = translatePlan(plan);
    const isCurrentPlan = plan.name === currentPlanName;
    const planOrder = { 'Basic': 1, 'Essential': 2, 'Professional': 3 };
    const currentPlanOrder = planOrder[currentPlanName as keyof typeof planOrder] || 0;
    const thisPlanOrder = planOrder[plan.name as keyof typeof planOrder];
    
    let actionButton;
    if (isCurrentPlan) {
        actionButton = <Button variant="secondary" size="md" className="w-full" disabled>{t('common:settingsBillingSubscription.yourCurrentPlan')}</Button>;
    } else if (thisPlanOrder > currentPlanOrder) {
        actionButton = <Button variant="primary" size="md" className="w-full" onClick={() => onSelectPlan(plan.name)}>{t('common:settingsBillingSubscription.upgradePlan')}</Button>;
    } else {
        actionButton = <Button variant="outline" size="md" className="w-full" onClick={() => onSelectPlan(plan.name)}>{t('common:settingsBillingSubscription.downgradePlan')}</Button>;
    }

    return (
        <Card className={`flex flex-col p-6 border-2 ${isCurrentPlan ? 'border-swiss-mint shadow-lg' : 'border-gray-200'} relative`} hoverEffect={!isCurrentPlan}>
             {isCurrentPlan && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase bg-swiss-mint rounded-full">{t('common:settingsBillingSubscription.yourCurrentPlan')}</span>
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
  const { t, i18n } = useTranslation(['dashboard', 'common', 'subscription', 'settings']);
  const location = useLocation();
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();
  const {
    status,
    subscription,
    plan,
    cancelAtPeriodEnd,
    paymentGateway,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscription();

  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = React.useState(false);
  const [cancelRequestSubmitted, setCancelRequestSubmitted] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState<string>('');

  // Deep-link support: scroll within this section to the manage card.
  React.useEffect(() => {
    const focus = new URLSearchParams(location.search).get('focus');
    const hash = (location.hash || '').replace('#', '').trim();
    if (hash !== 'billingSubscription' || focus !== 'manage-subscription') return;
    // Wait a tick for layout (tabs / scroll containers)
    window.setTimeout(() => {
      document.getElementById('manage-subscription')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [location.hash, location.search]);

  const formatStatusKey = React.useCallback((value: string | null) => {
    if (!value) return null;
    switch (value) {
      case 'GRACE_PERIOD':
        return 'gracePeriod';
      case 'PAST_DUE':
        return 'pastDue';
      default:
        return value.toLowerCase();
    }
  }, []);

  const statusLabel = React.useMemo(() => {
    const key = formatStatusKey(status);
    if (!key) return t('common:notAvailable');
    return t(`subscription:status.${key}` as any);
  }, [formatStatusKey, status, t]);

  const formatDate = React.useCallback(
    (dateValue?: string | null) => {
      if (!dateValue) return t('common:notAvailable');
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return t('common:notAvailable');
      return d.toLocaleDateString(i18n.language);
    },
    [i18n.language, t]
  );

  const currentPeriodLabel = React.useMemo(() => {
    const start = subscription?.currentPeriodStart;
    const end = subscription?.currentPeriodEnd;
    if (!start && !end) return t('common:notAvailable');
    return `${formatDate(start || null)} – ${formatDate(end || null)}`;
  }, [formatDate, subscription?.currentPeriodEnd, subscription?.currentPeriodStart, t]);

  const handleSubmitCancellationRequest = async () => {
    if (!subscription?.id) return;
    setIsSubmittingCancel(true);
    try {
      const res = await request('/subscriptions/cancel-request', {
        method: 'POST',
        body: JSON.stringify({
          reason: cancelReason?.trim() || undefined,
        }),
      });

      if (!res?.success) {
        throw new Error('cancel_request_failed');
      }

      setCancelRequestSubmitted(true);
      setIsCancelModalOpen(false);
      setCancelReason('');
      addNotification({
        title: t('common:notifications.successTitle'),
        message: t('common:notifications.requestSubmitted'),
        type: 'success',
      });
    } catch (err) {
      console.error('Cancellation request failed:', err);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('subscription:errors.cancelRequestFailed'),
        type: 'error',
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };
  
  const handleSelectPlan = (planName: string) => {
      // Placeholder until checkout flow exists - keep UX translated
      addNotification({
        title: t('common:notifications.infoTitle'),
        message: t('common:settingsBillingSubscription.planChangeNotImplemented', { planName }),
        type: 'info',
      });
  };

  const foundationPlans = pricingService.getFoundationPlans();

  return (
    <SettingsSectionWrapper title={t('settings:page.billingSubscription')} icon={WalletIcon}>
      <div className="space-y-8">
        {/* Current subscription summary (connected to real subscription API) */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h3 className="text-md font-medium text-gray-700">{t('common:settingsBillingSubscription.currentPlan')}</h3>
              <p className="text-2xl font-semibold text-swiss-mint mt-1">
                {subscriptionLoading
                  ? t('common:loading')
                  : plan?.name || t('subscription:info.noPlan')}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{t('common:labels.status', 'Status')}:</span>{' '}
              {subscriptionLoading ? t('common:loading') : statusLabel}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">{t('subscription:info.currentPeriod')}:</span> {currentPeriodLabel}
            </div>
            <div>
              <span className="font-medium">{t('subscription:info.cancelAtPeriodEnd')}:</span>{' '}
              {cancelAtPeriodEnd ? t('common:yes') : t('common:no')}
            </div>
          </div>

          {subscriptionError && (
            <p className="text-xs text-swiss-coral mt-2">{t('subscription:errors.fetchFailed')}</p>
          )}
        </div>

        {/* Foundation: show plan cards */}
        {userRole === UserRole.FOUNDATION && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {foundationPlans.map(p => (
              <PlanCard
                key={p.name}
                plan={p}
                currentPlanName={plan?.name}
                onSelectPlan={handleSelectPlan}
              />
            ))}
          </div>
        )}

        {/* Manage subscription */}
        <Card id="manage-subscription" className="p-6">
          <h3 className="text-xl font-semibold text-swiss-charcoal mb-2">
            {t('common:settingsBillingSubscription.manageSubscriptionTitle')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {t('common:settingsBillingSubscription.manageSubscriptionDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="secondary"
              leftIcon={CreditCardIcon}
              onClick={() => window.open(paymentGateway?.portalUrl || '#', '_blank')}
              disabled={!paymentGateway?.portalUrl}
            >
              {t('common:settingsBillingSubscription.managePaymentButton')}
            </Button>
            <Button
              variant="danger"
              leftIcon={XCircleIcon}
              onClick={() => setIsCancelModalOpen(true)}
              disabled={!subscription?.id || cancelAtPeriodEnd || cancelRequestSubmitted}
            >
              {t('common:settingsBillingSubscription.cancelSubscription')}
            </Button>
          </div>
          {!paymentGateway?.portalUrl && (
            <p className="text-xs text-gray-400 mt-2">
              {t('common:settingsBillingSubscription.stripePortalLinkNotConfigured')}
            </p>
          )}
          {(cancelAtPeriodEnd || cancelRequestSubmitted) && (
            <p className="text-xs text-gray-500 mt-2">
              {t('subscription:info.cancelAtPeriodEnd')}
            </p>
          )}
        </Card>

        {isCancelModalOpen && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2 text-swiss-coral">
                {t('common:settingsBillingSubscription.confirmCancelTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('common:settingsBillingSubscription.confirmCancelMessage')}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common:description')} ({t('common:optional')})
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint text-sm"
                rows={3}
                placeholder={t('common:settingsBillingSubscription.confirmCancelMessage')}
              />
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="light" onClick={() => setIsCancelModalOpen(false)} disabled={isSubmittingCancel}>
                  {t('common:settingsBillingSubscription.keepSubscription')}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleSubmitCancellationRequest}
                  disabled={isSubmittingCancel}
                >
                  {isSubmittingCancel ? t('common:loading') : t('common:settingsBillingSubscription.yesCancel')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSectionWrapper>
  );
};

export default BillingSubscriptionSettings;
