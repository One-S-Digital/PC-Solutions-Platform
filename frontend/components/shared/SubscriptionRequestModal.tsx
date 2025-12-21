import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PricingPlan, SubscriptionTier } from '../../types';
import Button from '../ui/Button';
import { useAppContext } from '../../contexts/AppContext';

interface SubscriptionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan;
  billingPeriod: 'monthly' | 'yearly';
  tier: SubscriptionTier;
  onSubmit: (data: SubscriptionRequestFormData) => Promise<void>;
  isLoading?: boolean;
}

export interface SubscriptionRequestFormData {
  planId: string;
  tier: SubscriptionTier;
  billingPeriod: string;
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
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation(['subscription', 'common']);
  const { user } = useAppContext();
  
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone'>('email');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with user data
  useEffect(() => {
    if (user) {
      setContactName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || '');
      setContactEmail(user.email || '');
    }
  }, [user]);

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

    if (!contactName.trim() || !contactEmail.trim()) {
      setError(t('subscription:requestForm.validation.required', 'Please fill in all required fields'));
      return;
    }

    try {
      await onSubmit({
        planId: plan.id || '',
        tier,
        billingPeriod,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        preferredContact,
        message: message.trim() || undefined,
        organizationId: user?.organizationId,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const formatPrice = () => {
    const price = billingPeriod === 'yearly' && plan.annualPrice ? plan.annualPrice : plan.price;
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: plan.currency || 'CHF',
    }).format(price || 0);
  };

  // Success view after submission
  if (submitted) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('subscription:requestForm.title', 'Request Subscription')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t('subscription:requestForm.subtitle', 'Complete the form below to request your subscription')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
                {t(`subscription:tier.${tier.toLowerCase()}`, tier)} • {billingPeriod === 'yearly' 
                  ? t('subscription:requestForm.billedAnnually', 'Billed annually') 
                  : t('subscription:requestForm.billedMonthly', 'Billed monthly')
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-swiss-teal">{formatPrice()}</p>
              <p className="text-sm text-gray-500">
                /{billingPeriod === 'yearly' ? t('subscription:requestForm.year', 'year') : t('subscription:requestForm.month', 'month')}
              </p>
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
              {t('subscription:requestForm.message', 'Additional Message')} ({t('common:optional', 'Optional')})
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent resize-none"
              placeholder={t('subscription:requestForm.messagePlaceholder', 'Any questions or special requirements...')}
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">
              {t('subscription:requestForm.howItWorks.title', 'How it works:')}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>{t('subscription:requestForm.howItWorks.step1', 'Submit your request')}</li>
              <li>{t('subscription:requestForm.howItWorks.step2', 'Receive an invoice via email')}</li>
              <li>{t('subscription:requestForm.howItWorks.step3', 'Pay the invoice')}</li>
              <li>{t('subscription:requestForm.howItWorks.step4', 'Your subscription is activated')}</li>
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
