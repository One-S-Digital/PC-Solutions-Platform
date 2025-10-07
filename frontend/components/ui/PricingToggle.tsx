import React from 'react';
import { useTranslation } from '@workspace/translations';

interface PricingToggleProps {
  isAnnual: boolean;
  onToggle: (isAnnual: boolean) => void;
  className?: string;
}

const PricingToggle: React.FC<PricingToggleProps> = ({ isAnnual, onToggle, className = '' }) => {
  const { t } = useTranslation('pricing');

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="bg-gray-200 rounded-lg p-1 flex">
        <button
          onClick={() => onToggle(false)}  
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            !isAnnual 
              ? 'bg-white text-swiss-charcoal shadow-sm' 
              : 'text-gray-700 hover:text-swiss-charcoal'
          }`}
        >
          {t('pricingPage.monthly')}
        </button>
        <button
          onClick={() => onToggle(true)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            isAnnual 
              ? 'bg-white text-swiss-charcoal shadow-sm' 
              : 'text-gray-700 hover:text-swiss-charcoal'
          }`}
        >
          {t('pricingPage.annual')}
        </button>
      </div>
      {isAnnual && (
        <div className="ml-3 text-sm text-swiss-mint font-medium">
          {t('pricingPage.saveUpTo10')}
        </div>
      )}
    </div>
  );
};

export default PricingToggle;
