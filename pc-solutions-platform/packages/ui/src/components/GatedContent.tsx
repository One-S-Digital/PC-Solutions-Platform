import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

interface GatedContentProps {
  locked: boolean;
  featureKey: string;
  previewContent?: string;
  upgradeBenefit: string;
  userPlan?: 'Basic' | 'Professional' | 'Enterprise';
  children: React.ReactNode;
  className?: string;
  onUpgradeClick?: () => void;
}

export function GatedContent({
  locked,
  featureKey,
  previewContent,
  upgradeBenefit,
  userPlan = 'Basic',
  children,
  className,
  onUpgradeClick,
}: GatedContentProps) {
  const { t } = useTranslation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setShowUpgradeModal(true);
    }
  };

  if (!locked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div className={clsx('relative', className)}>
        {/* Content with blur overlay */}
        <div className="relative">
          <div className="blur-sm opacity-60 select-none pointer-events-none">
            {children}
          </div>
          
          {/* Preview content overlay */}
          {previewContent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-surface-1/90 backdrop-blur-sm rounded-lg p-4 max-w-sm text-center">
                <p className="text-text-default text-sm">{previewContent}</p>
              </div>
            </div>
          )}
        </div>

        {/* Lock badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-accent text-accent-contrast rounded-full p-1.5 shadow-soft">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Upgrade CTA Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-1 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-text-strong text-sm font-medium mb-1">
                {t('gated.unlockFeature', 'Unlock this feature')}
              </p>
              <p className="text-text-muted text-xs">
                {upgradeBenefit}
              </p>
            </div>
            <button
              onClick={handleUpgradeClick}
              className="ml-4 px-4 py-2 bg-accent text-accent-contrast rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('gated.upgradeNow', 'Upgrade Now')}
            </button>
          </div>
        </div>

        {/* Hover overlay for better UX */}
        <div className="absolute inset-0 bg-transparent hover:bg-accent/5 transition-colors cursor-pointer" 
             onClick={handleUpgradeClick}
             title={t('gated.clickToUpgrade', 'Click to upgrade and unlock this feature')}
        />
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          featureKey={featureKey}
          upgradeBenefit={upgradeBenefit}
          userPlan={userPlan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
}

// Upgrade Modal Component
interface UpgradeModalProps {
  featureKey: string;
  upgradeBenefit: string;
  userPlan: 'Basic' | 'Professional' | 'Enterprise';
  onClose: () => void;
}

function UpgradeModal({ featureKey, upgradeBenefit, userPlan, onClose }: UpgradeModalProps) {
  const { t } = useTranslation();

  const getFeatureBenefits = (key: string) => {
    const benefits: Record<string, string[]> = {
      'advanced_reports': [
        t('gated.benefits.advancedAnalytics', 'Advanced analytics and insights'),
        t('gated.benefits.customReports', 'Custom report generation'),
        t('gated.benefits.dataExport', 'Export data to Excel/PDF')
      ],
      'bulk_upload': [
        t('gated.benefits.bulkOperations', 'Bulk upload and operations'),
        t('gated.benefits.timeSaving', 'Save hours of manual work'),
        t('gated.benefits.batchProcessing', 'Process multiple items at once')
      ],
      'priority_support': [
        t('gated.benefits.prioritySupport', 'Priority customer support'),
        t('gated.benefits.fasterResponse', 'Faster response times'),
        t('gated.benefits.dedicatedHelp', 'Dedicated support channel')
      ],
      'unlimited_messaging': [
        t('gated.benefits.unlimitedMessages', 'Unlimited messages'),
        t('gated.benefits.directContact', 'Direct contact with parents'),
        t('gated.benefits.messageHistory', 'Full message history')
      ]
    };
    
    return benefits[key] || [
      t('gated.benefits.general1', 'Access to premium features'),
      t('gated.benefits.general2', 'Enhanced functionality'),
      t('gated.benefits.general3', 'Priority support')
    ];
  };

  const handleUpgrade = () => {
    // Navigate to pricing page or trigger upgrade flow
    window.location.href = '/pricing';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-surface-1 rounded-lg shadow-pop max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="bg-accent text-accent-contrast rounded-full p-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-strong">
                {t('gated.unlockFeature', 'Unlock this feature')}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-strong"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Hero message */}
            <div className="text-center mb-6">
              <h4 className="text-xl font-semibold text-text-strong mb-2">
                {t('gated.growFaster', 'Grow faster with Professional')}
              </h4>
              <p className="text-text-muted">
                {upgradeBenefit}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              {getFeatureBenefits(featureKey).map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="bg-success/20 text-success rounded-full p-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-text-default text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="bg-surface-2 rounded-lg p-4 mb-6">
              <p className="text-text-muted text-sm italic">
                "{t('gated.testimonial', 'Switching to Pro saved us hours each week.')}"
              </p>
              <p className="text-text-strong text-sm font-medium mt-1">
                — Little Stars Daycare
              </p>
            </div>

            {/* Pricing snippet */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">
                <span>{t('gated.startingAt', 'Starting at')}</span>
                <span className="text-lg font-bold">CHF 29</span>
                <span>{t('gated.perMonth', '/month')}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-text-muted hover:text-text-strong transition-colors"
            >
              {t('gated.maybeLater', 'Maybe later')}
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 bg-accent text-accent-contrast rounded-md hover:opacity-90 transition-opacity font-medium"
            >
              {t('gated.upgradeNow', 'Upgrade Now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}