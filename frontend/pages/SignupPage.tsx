import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/hooks/useAuth';
import { APP_NAME } from '../constants';
import { SquaresPlusIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { SignUp } from '@clerk/clerk-react';

const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        navigate('/admin/content-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">
            {t('signupPage.title', { appName: APP_NAME })}
          </h1>
          <p className="text-sm text-gray-500">{t('signupPage.subtitle')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-swiss-mint hover:bg-swiss-mint-dark text-white',
                card: 'shadow-none',
                headerTitle: 'text-swiss-charcoal',
                headerSubtitle: 'text-gray-500',
                socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50',
                formFieldInput: 'border-gray-300 focus:border-swiss-mint focus:ring-swiss-mint',
                footerActionLink: 'text-swiss-mint hover:text-swiss-mint-dark',
              },
            }}
            redirectUrl="/dashboard"
            signInUrl="/login"
          />
        </div>

        <div className="mt-6 text-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default SignupPage;