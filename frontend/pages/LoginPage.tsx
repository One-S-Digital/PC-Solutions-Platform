import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { SquaresPlusIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { APP_NAME } from '../constants';

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  // Redirect if already signed in
  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">{t('common:loginPage.title', { appName: APP_NAME })}</h1>
          <p className="text-sm text-gray-500">{t('common:loginPage.subtitle')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <SignIn 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
                formButtonPrimary: 'bg-swiss-mint hover:bg-swiss-mint/90 text-white',
                footerActionLink: 'text-swiss-mint hover:text-swiss-mint/80',
                formFieldInput: 'border-gray-300 focus:border-swiss-mint focus:ring-swiss-mint',
                identityPreviewEditButton: 'text-swiss-mint hover:text-swiss-mint/80',
              },
            }}
            routing="path"
            path="/login"
            signUpUrl="/signup"
            afterSignInUrl="/dashboard"
          />
        </div>

        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
