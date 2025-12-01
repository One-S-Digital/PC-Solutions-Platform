import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface VerificationProgressProps {
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string | null;
  onRetry?: () => void;
}

const VerificationProgress: React.FC<VerificationProgressProps> = ({
  status,
  error,
  onRetry,
}) => {
  const { t } = useTranslation('common');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    t('verificationProgress.steps.verifyingEmail'),
    t('verificationProgress.steps.creatingAccount'),
    t('verificationProgress.steps.settingUpProfile'),
    t('verificationProgress.steps.almostReady')
  ];

  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = Math.min(prev + 1, steps.length - 1);
          setProgress((nextStep / (steps.length - 1)) * 100);
          return nextStep;
        });
      }, 2000);

      return () => clearInterval(interval);
    } else if (status === 'ready') {
      setProgress(100);
      setCurrentStep(steps.length - 1);
    }
  }, [status, steps.length]);

  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="w-8 h-8 text-green-600" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />;
      default:
        return <ClockIcon className="w-8 h-8 text-blue-600 animate-spin" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'ready':
        return t('verificationProgress.messages.accountSetupComplete');
      case 'error':
        return error || t('verificationProgress.messages.somethingWentWrong');
      case 'processing':
        return steps[currentStep] || t('verificationProgress.messages.preparingAccount');
      default:
        return t('verificationProgress.messages.preparingAccount');
    }
  };

  return (
    <div className="max-w-md mx-auto text-center p-8">
      <div className="mb-6">
        {getStatusIcon()}
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {status === 'ready' ? t('verificationProgress.title.ready') : t('verificationProgress.title.processing')}
      </h2>
      
      <p className="text-gray-600 mb-6">
        {getStatusMessage()}
      </p>

      {status === 'processing' && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {t('verificationProgress.progress.complete', { percent: Math.round(progress) })}
          </p>
        </div>
      )}

      {status === 'error' && onRetry && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t('verificationProgress.messages.contactSupport')}
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('verificationProgress.messages.tryAgain')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className="text-green-600">
          <p className="text-sm">
            {t('verificationProgress.messages.redirectingToDashboard')}
          </p>
        </div>
      )}
    </div>
  );
};

export default VerificationProgress;