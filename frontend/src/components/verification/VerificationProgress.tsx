import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface VerificationProgressProps {
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string | null;
  onRetry?: () => void;
  showLoginLink?: boolean;
}

const VerificationProgress: React.FC<VerificationProgressProps> = ({
  status,
  error,
  onRetry,
  showLoginLink = true,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Verifying email...',
    'Creating your account...',
    'Setting up your profile...',
    'Almost ready...'
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
        return 'Account setup complete!';
      case 'error':
        return error || 'Something went wrong';
      case 'processing':
        return steps[currentStep] || 'Setting up your account...';
      default:
        return 'Preparing your account...';
    }
  };

  return (
    <div className="max-w-md mx-auto text-center p-8">
      <div className="mb-6">
        {getStatusIcon()}
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {status === 'ready' ? 'Welcome!' : 'Setting Up Your Account'}
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
            {Math.round(progress)}% complete
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Your email verification was successful!</strong>
            </p>
            <p className="text-sm text-yellow-700">
              However, account setup is taking longer than expected. This may be due to:
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside mt-2 text-left">
              <li>Backend webhook processing delay</li>
              <li>Database connection issues</li>
              <li>Server load</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            {showLoginLink && (
              <Link
                to="/login"
                className="block w-full px-4 py-2 bg-swiss-mint text-white rounded-md hover:bg-opacity-90 transition-colors font-medium"
              >
                Try Logging In
              </Link>
            )}
            
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Wait and Try Again
              </button>
            )}
            
            <p className="text-xs text-gray-500 mt-4">
              If you can't log in after a few minutes, please contact support with the error message above.
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="text-green-600">
          <p className="text-sm">
            Redirecting you to your dashboard...
          </p>
        </div>
      )}
    </div>
  );
};

export default VerificationProgress;