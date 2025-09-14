import React from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

interface FeatureLockProps {
  featureKey: string;
  userPlan?: 'Basic' | 'Professional' | 'Enterprise';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function FeatureLock({
  featureKey,
  userPlan = 'Basic',
  size = 'md',
  showTooltip = true,
  className,
}: FeatureLockProps) {
  const { t } = useTranslation();

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 p-1';
      case 'lg':
        return 'w-6 h-6 p-1.5';
      default:
        return 'w-5 h-5 p-1.5';
    }
  };

  const getRequiredPlan = (key: string): 'Professional' | 'Enterprise' => {
    const professionalFeatures = [
      'advanced_reports',
      'bulk_upload',
      'unlimited_messaging',
      'priority_support',
      'custom_branding',
      'advanced_analytics'
    ];
    
    return professionalFeatures.includes(key) ? 'Professional' : 'Enterprise';
  };

  const requiredPlan = getRequiredPlan(featureKey);
  const isLocked = userPlan === 'Basic' || (userPlan === 'Professional' && requiredPlan === 'Enterprise');

  if (!isLocked) {
    return null;
  }

  return (
    <div className={clsx('relative inline-block', className)}>
      <div className={clsx(
        'bg-accent text-accent-contrast rounded-full shadow-soft',
        getSizeClasses(size)
      )}>
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-surface-1 border border-border rounded-lg shadow-pop text-sm whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="text-text-strong font-medium">
            {t('gated.availableOn', 'Available on')} {requiredPlan}
          </div>
          <div className="text-text-muted text-xs">
            {t('gated.upgradeToAccess', 'Upgrade to access this feature')}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
        </div>
      )}
    </div>
  );
}

// Feature Access Badge Component
interface FeatureAccessBadgeProps {
  featureKey: string;
  userPlan?: 'Basic' | 'Professional' | 'Enterprise';
  className?: string;
}

export function FeatureAccessBadge({
  featureKey,
  userPlan = 'Basic',
  className,
}: FeatureAccessBadgeProps) {
  const { t } = useTranslation();

  const getRequiredPlan = (key: string): 'Professional' | 'Enterprise' => {
    const professionalFeatures = [
      'advanced_reports',
      'bulk_upload',
      'unlimited_messaging',
      'priority_support',
      'custom_branding',
      'advanced_analytics'
    ];
    
    return professionalFeatures.includes(key) ? 'Professional' : 'Enterprise';
  };

  const requiredPlan = getRequiredPlan(featureKey);
  const isLocked = userPlan === 'Basic' || (userPlan === 'Professional' && requiredPlan === 'Enterprise');

  if (!isLocked) {
    return (
      <div className={clsx('inline-flex items-center gap-1.5 px-2 py-1 bg-success/20 text-success rounded-full text-xs font-medium', className)}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {t('gated.unlocked', 'Unlocked')}
      </div>
    );
  }

  return (
    <div className={clsx('inline-flex items-center gap-1.5 px-2 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium', className)}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      {t('gated.locked', 'Locked')}
    </div>
  );
}

// Upgrade CTA Component
interface UpgradeCTAProps {
  featureKey: string;
  upgradeBenefit: string;
  variant?: 'inline' | 'button' | 'banner';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function UpgradeCTA({
  featureKey,
  upgradeBenefit,
  variant = 'button',
  size = 'md',
  className,
  onClick,
}: UpgradeCTAProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = '/pricing';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  if (variant === 'banner') {
    return (
      <div className={clsx('bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-lg p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-text-strong font-medium mb-1">
              {t('gated.unlockFeature', 'Unlock this feature')}
            </p>
            <p className="text-text-muted text-sm">
              {upgradeBenefit}
            </p>
          </div>
          <button
            onClick={handleClick}
            className={clsx(
              'ml-4 bg-accent text-accent-contrast rounded-md font-medium hover:opacity-90 transition-opacity',
              getSizeClasses(size)
            )}
          >
            {t('gated.upgradeNow', 'Upgrade Now')}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={clsx('inline-flex items-center gap-2', className)}>
        <span className="text-text-muted text-sm">
          {t('gated.upgradeToAccess', 'Upgrade to access')}:
        </span>
        <button
          onClick={handleClick}
          className={clsx(
            'text-accent hover:text-accent/80 font-medium transition-colors',
            getSizeClasses(size)
          )}
        >
          {t('gated.upgradeNow', 'Upgrade Now')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'bg-accent text-accent-contrast rounded-md font-medium hover:opacity-90 transition-opacity',
        getSizeClasses(size),
        className
      )}
    >
      {t('gated.upgradeNow', 'Upgrade Now')}
    </button>
  );
}