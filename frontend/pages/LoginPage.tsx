import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { STANDARD_INPUT_FIELD, APP_NAME } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SquaresPlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

// Mock social icons
const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
);
const FacebookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.97 9-9.95z"></path></svg>
);

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  
  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'Super Admin') {
        navigate('/admin/content-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('loginPage.errorBothFields'));
      return;
    }
    setIsLoading(true);
    const result = await login(email, password);
    if (result.success) {
      // The redirect is handled by the useEffect watching currentUser
    } else {
      setError(result.message || t('errors.unknown'));
    }
    setIsLoading(false);
  };
  

  const handleSocialLogin = (provider: string) => {
    alert(t('loginPage.socialLoginTBD', { provider }));
  };

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">{t('loginPage.title', { appName: APP_NAME })}</h1>
          <p className="text-sm text-gray-500">{t('loginPage.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('loginPage.emailLabel')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={STANDARD_INPUT_FIELD}
              required
              placeholder={t('loginPage.emailPlaceholder')}
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('loginPage.passwordLabel')}
                </label>
                <a href="#/password-reset" onClick={(e) => {e.preventDefault(); alert(t('loginPage.forgotPasswordTBD'));}} className="text-xs text-swiss-mint hover:underline">
                    {t('loginPage.forgotPassword')}
                </a>
            </div>
            <div className="relative">
                <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                placeholder={t('loginPage.passwordPlaceholder')}
                />
                 <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                </button>
            </div>
          </div>
          <div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? t('loginPage.loggingIn') : t('buttons.login')}
            </Button>
          </div>
        </form>


        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('loginPage.orContinueWith')}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="light" onClick={() => handleSocialLogin('Google')} className="w-full">
              <GoogleIcon className="w-5 h-5 mr-2" /> {t('loginPage.google')}
            </Button>
            <Button variant="light" onClick={() => handleSocialLogin('Facebook')} className="w-full">
              <FacebookIcon className="w-5 h-5 mr-2" /> {t('loginPage.facebook')}
            </Button>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-600 space-y-2">
            <p>
            {t('loginPage.noAccount')}{' '}
            <Link to="/signup" className="font-medium text-swiss-mint hover:underline">
                {t('buttons.signUp')}
            </Link>
            </p>
            <p>
            {t('loginPage.viewPlansPrompt')}{' '}
            <Link to="/pricing" className="font-medium text-swiss-mint hover:underline">
                {t('loginPage.viewPlans')}
            </Link>
            </p>
            <div className="bg-gradient-to-r from-swiss-teal/10 to-swiss-mint/10 rounded-lg p-4 mt-4">
              <p className="text-lg font-semibold text-swiss-charcoal text-center mb-2">
                {t('loginPage.parentLookingForCreche')}
              </p>
              <div className="text-center">
                <Link 
                  to="/parent-lead-form" 
                  className="inline-flex items-center px-6 py-3 bg-swiss-teal text-white font-medium rounded-lg hover:bg-swiss-teal/90 transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <span className="mr-2">🏠</span>
                  {t('loginPage.findCrecheHere')}
                </Link>
              </div>
            </div>
        </div>

        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;