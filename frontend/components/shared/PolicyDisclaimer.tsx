import React, { useState } from 'react';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface PolicyDisclaimerProps {
  variant?: 'full' | 'compact';
}

export const PolicyDisclaimer: React.FC<PolicyDisclaimerProps> = ({ variant = 'full' }) => {
  const { t } = useTranslation('content');
  const [isExpanded, setIsExpanded] = useState(variant === 'full');

  const disclaimerText = t('content:statePolicies.disclaimer', 
    `All policies and documents listed here are sourced directly from official cantonal 
    and federal websites. ProCrèche does not create, modify or guarantee the legal 
    validity of these documents and cannot be held liable for their content or for any 
    changes made by the issuing authorities. Always refer to the official source for 
    the latest version.`
  );

  if (variant === 'compact') {
    return (
      <div 
        className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r"
        role="note"
        aria-label={t('content:statePolicies.legalNotice', 'Legal Notice')}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={isExpanded}
        >
          <span className="flex items-center text-amber-800 font-medium text-sm">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            {t('content:statePolicies.legalNotice', 'Legal Notice')}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-amber-600" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-amber-600" />
          )}
        </button>
        {isExpanded && (
          <p className="mt-2 text-sm text-amber-700">{disclaimerText}</p>
        )}
      </div>
    );
  }

  return (
    <div 
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
      role="note"
      aria-label={t('content:statePolicies.legalNotice', 'Legal Notice')}
    >
      <div className="flex items-start">
        <InformationCircleIcon className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-800 mb-1">
            {t('content:statePolicies.legalNotice', 'Legal Notice')}
          </h3>
          <p className="text-sm text-amber-700">{disclaimerText}</p>
        </div>
      </div>
    </div>
  );
};

