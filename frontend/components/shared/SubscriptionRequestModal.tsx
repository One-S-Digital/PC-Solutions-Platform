import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PricingPlan, SubscriptionTier, UserRole } from '../../types';
import Button from '../ui/Button';
import { useAppContext } from '../../contexts/AppContext';

interface SubscriptionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan;
  billingPeriod?: 'monthly' | 'yearly';
  tier?: SubscriptionTier;
  /**
   * Backend `SubscriptionPlan.id` used by /subscriptions/request.
   * Pricing cards use static `PRICING_PLANS`, so we pass the real plan id separately.
   */
  subscriptionPlanId?: string;
  onSubmit: (data: SubscriptionRequestFormData) => Promise<void>;
  isLoading?: boolean;
}

export interface SubscriptionRequestFormData {
  planId: string;
  tier?: SubscriptionTier;
  billingPeriod?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContact: 'email' | 'phone';
  message?: string;
  organizationId?: string;
}

const SubscriptionRequestModal: React.FC<SubscriptionRequestModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingPeriod,
  tier,
  subscriptionPlanId,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation(['subscription', 'common']);
  const { currentUser } = useAppContext();
  const isFoundation = plan.role === UserRole.FOUNDATION;
  const isSupplier = plan.role === UserRole.PRODUCT_SUPPLIER;
  const isServiceProvider = plan.role === UserRole.SERVICE_PROVIDER;
  
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone'>('email');
  const [organizationName, setOrganizationName] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with user data
  useEffect(() => {
    if (currentUser) {
      setContactName(`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || '');
      setContactEmail(currentUser.email || '');
      setOrganizationName(currentUser.orgName || '');
    }
  }, [currentUser]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contactName.trim() || !contactEmail.trim() || (!isFoundation && !organizationName.trim())) {
      setError(t('subscription:requestForm.validation.required', 'Please fill in all required fields'));
      return;
    }

    if (!subscriptionPlanId) {
      setError(
        t(
          'subscription:requestForm.validation.planNotConfigured',
          'This plan is not configured yet. Please contact support.'
        )
      );
      return;
    }

    if (isFoundation && (!tier || !billingPeriod)) {
      setError(t('subscription:requestForm.validation.required', 'Please fill in all required fields'));
      return;
    }

    const composedMessage = (() => {
      if (isFoundation) {
        return message.trim() || undefined;
      }
      const parts: string[] = [];
      if (organizationName.trim()) parts.push(`Organization: ${organizationName.trim()}`);
      if (website.trim()) parts.push(`Website: ${website.trim()}`);
      if (message.trim()) parts.push(`Message: ${message.trim()}`);
      return parts.length ? parts.join('\n') : undefined;
    })();

    try {
      await onSubmit({
        planId: subscriptionPlanId,
        tier: isFoundation ? tier : undefined,
        billingPeriod: isFoundation ? billingPeriod : undefined,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        preferredContact,
        message: composedMessage,
        organizationId: currentUser?.orgId,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const formatPrice = () => {
    const price =
      billingPeriod === 'yearly'
        ? plan.price?.annually
        : plan.price?.monthly;
    const numericPrice = typeof price === 'number' && Number.isFinite(price) ? price : 0;
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(numericPrice);
  };

  // Success view after submission
  if (submitted) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-success-title"
      >
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center" role="document">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 id="subscription-success-title" className="text-2xl font-bold text-gray-900 mb-4">
            {t('subscription:requestForm.success.title', 'Request Submitted!')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('subscription:requestForm.success.description', 
              'Thank you for your interest in the {{planName}} plan. Our team will review your request and send you an invoice within 48 hours.',
              { planName: plan.name }
            )}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-sm">
                {t('subscription:requestForm.success.estimatedTime', 'Estimated response time: 24-48 hours')}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {t('subscription:requestForm.success.emailSent', 
              'A confirmation email has been sent to {{email}}',
              { email: contactEmail }
            )}
          </p>
          <Button variant="primary" onClick={onClose} className="w-full">
            {t('common:buttons.close', 'Close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" role="document">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="subscription-modal-title" className="text-xl font-bold text-gray-900">
            {isSupplier
              ? t('subscription:requestForm.titles.supplier', 'Supplier enquiry')
              : isServiceProvider
                ? t('subscription:requestForm.titles.serviceProvider', 'Service provider enquiry')
                : t('subscription:requestForm.titles.foundation', t('subscription:requestForm.title', 'Request Subscription'))}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
            {isSupplier
              ? t(
                  'subscription:requestForm.subtitles.supplier',
                  'Tell us about your company and products. We will contact you with pricing and next steps.'
                )
              : isServiceProvider
                ? t(
                    'subscription:requestForm.subtitles.serviceProvider',
                    'Tell us about your company and services. We will contact you with pricing and next steps.'
                  )
                : t(
                    'subscription:requestForm.subtitles.foundation',
                    t('subscription:requestForm.subtitle', 'Complete the form below to request your subscription')
                  )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('common:buttons.close', 'Close')}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{t('subscription:requestForm.selectedPlan', 'Selected Plan')}</p>
              <p className="text-lg font-semibold text-gray-900">{plan.emoji} {plan.name}</p>
              <p className="text-sm text-gray-500 capitalize">
                {isFoundation && tier && billingPeriod ? (
                  <>
                    {t(`subscription:tier.${tier.toLowerCase()}`, tier)} •{' '}
                    {billingPeriod === 'yearly'
                      ? t('subscription:requestForm.billedAnnually', 'Billed annually')
                      : t('subscription:requestForm.billedMonthly', 'Billed monthly')}
                  </>
                ) : (
                  <span>
                    {isSupplier
                      ? t('subscription:requestForm.roleLabel.supplier', 'Supplier')
                      : t('subscription:requestForm.roleLabel.serviceProvider', 'Service provider')}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              {isFoundation ? (
                <>
                  <p className="text-2xl font-bold text-swiss-teal">{formatPrice()}</p>
                  <p className="text-sm text-gray-500">
                    /{billingPeriod === 'yearly' ? t('subscription:requestForm.year', 'year') : t('subscription:requestForm.month', 'month')}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-swiss-teal">
                  {t('subscription:requestForm.priceOnRequest', 'Price on request')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!isFoundation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('subscription:requestForm.organizationName', 'Organization / Company')} *
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('subscription:requestForm.organizationNamePlaceholder', 'Your organization name')}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('subscription:requestForm.contactName', 'Contact Name')} *
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder={t('subscription:requestForm.contactNamePlaceholder', 'Your full name')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('subscription:requestForm.contactEmail', 'Email Address')} *
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('subscription:requestForm.contactEmailPlaceholder', 'your@email.com')}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('subscription:requestForm.contactPhone', 'Phone Number')} ({t('common:optional', 'Optional')})
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('subscription:requestForm.contactPhonePlaceholder', '+41 XX XXX XX XX')}
              />
            </div>
          </div>

          {!isFoundation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('subscription:requestForm.website', 'Website')} ({t('common:optional', 'Optional')})
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder={t('subscription:requestForm.websitePlaceholder', 'https://example.com')}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('subscription:requestForm.preferredContact', 'Preferred Contact Method')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferredContact"
                  value="email"
                  checked={preferredContact === 'email'}
                  onChange={() => setPreferredContact('email')}
                  className="text-swiss-teal focus:ring-swiss-teal"
                />
                <span className="text-sm text-gray-700">{t('subscription:requestForm.contactEmail', 'Email')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferredContact"
                  value="phone"
                  checked={preferredContact === 'phone'}
                  onChange={() => setPreferredContact('phone')}
                  className="text-swiss-teal focus:ring-swiss-teal"
                />
                <span className="text-sm text-gray-700">{t('subscription:requestForm.contactPhone', 'Phone')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isFoundation
                ? t('subscription:requestForm.message', 'Additional Message')
                : (isSupplier
                    ? t('subscription:requestForm.messageSupplier', 'Tell us about your products')
                    : t('subscription:requestForm.messageServiceProvider', 'Tell us about your services'))}{' '}
              ({t('common:optional', 'Optional')})
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent resize-none"
              placeholder={
                isFoundation
                  ? t('subscription:requestForm.messagePlaceholder', 'Any questions or special requirements...')
                  : (isSupplier
                      ? t('subscription:requestForm.messageSupplierPlaceholder', 'What do you sell? Any focus categories, MOQ, regions served, etc.')
                      : t('subscription:requestForm.messageServiceProviderPlaceholder', 'What services do you offer? Coverage region, pricing model, availability, etc.'))
              }
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">
              {t('subscription:requestForm.howItWorks.title', 'How it works:')}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              {isFoundation ? (
                <>
                  <li>{t('subscription:requestForm.howItWorks.step1', 'Submit your request')}</li>
                  <li>{t('subscription:requestForm.howItWorks.step2', 'Receive an invoice via email')}</li>
                  <li>{t('subscription:requestForm.howItWorks.step3', 'Pay the invoice')}</li>
                  <li>{t('subscription:requestForm.howItWorks.step4', 'Your subscription is activated')}</li>
                </>
              ) : (
                <>
                  <li>{t('subscription:requestForm.howItWorksVendor.step1', 'Submit your enquiry')}</li>
                  <li>{t('subscription:requestForm.howItWorksVendor.step2', 'We contact you with pricing')}</li>
                  <li>{t('subscription:requestForm.howItWorksVendor.step3', 'You receive next steps to get listed')}</li>
                </>
              )}
            </ol>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              {t('common:buttons.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading 
                ? t('subscription:requestForm.submitting', 'Submitting...') 
                : t('subscription:requestForm.submitButton', 'Submit Request')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionRequestModal;
