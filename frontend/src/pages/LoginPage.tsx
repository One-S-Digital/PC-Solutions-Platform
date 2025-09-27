import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser, useSignIn } from '@clerk/clerk-react';
import { APP_NAME, STANDARD_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signIn, setActive } = useSignIn();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn && user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setLoginError('');

    try {
      if (!signIn) {
        throw new Error('Clerk not loaded');
      }

      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/dashboard', { replace: true });
      } else if (result.status === 'needs_first_factor') {
        setLoginError('Two-factor authentication required');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'An error occurred during login';
      
      if (error.errors && error.errors.length > 0) {
        const err = error.errors[0];
        switch (err.code) {
          case 'form_password_incorrect':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'form_identifier_not_found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'form_identifier_invalid':
            errorMessage = 'Please enter a valid email address.';
            break;
          default:
            errorMessage = err.message || 'Invalid email or password';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} login clicked - mock implementation`);
    setLoginError(`${provider} login is not implemented in this demo.`);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="bg-swiss-mint rounded-lg p-2 w-12 h-12" />
          </div>
          
          <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">{t('auth:loginPage.title', { appName: APP_NAME })}</h1>
          <p className="text-sm text-gray-500">{t('auth:loginPage.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Error Message */}
          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Login Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{loginError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth:loginPage.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth:loginPage.emailPlaceholder')}
              className={STANDARD_INPUT_FIELD}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth:loginPage.password')}
              </label>
              <Link to="/forgot-password" className="text-sm text-swiss-mint hover:underline">
                {t('auth:loginPage.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth:loginPage.passwordPlaceholder')}
                className={STANDARD_INPUT_FIELD}
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : t('auth:loginPage.signIn')}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('auth:loginPage.orContinueWith')}</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleSocialLogin('Google')}
              className="flex items-center justify-center"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth:loginPage.google')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleSocialLogin('Facebook')}
              className="flex items-center justify-center"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {t('auth:loginPage.facebook')}
            </Button>
          </div>
        </form>

        {/* Sign Up Link */}
        <p className="mt-8 text-center text-sm text-gray-600">
          {t('auth:loginPage.noAccount')}{' '}
          <Link to="/signup" className="font-medium text-swiss-mint hover:underline">
            {t('auth:loginPage.signUp')}
          </Link>
        </p>
        
        {/* Parent Link */}
        <p className="mt-2 text-center text-xs text-gray-500">
          {t('auth:loginPage.parentLookingForCreche')}{' '}
          <Link to="/parent-lead-form" className="font-medium text-swiss-teal hover:underline">
            {t('auth:loginPage.findCrecheHere')}
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;