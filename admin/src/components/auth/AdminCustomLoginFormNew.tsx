import React, { useState } from 'react';
import { useSignIn, useAuth, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { SquaresPlusIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useSettings } from '../../hooks/useSettings';
import Card from '../design-system/Card';
import Button from '../design-system/Button';
import { STANDARD_INPUT_FIELD } from '../../constants/design-system';

interface AdminLoginFormData {
  email: string;
  password: string;
}

import { getAdminLogo } from '../../utils/settings';

// Mock social icons
const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
);

export default function AdminCustomLoginForm() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const { settings } = useSettings();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AdminLoginFormData>({
    email: '',
    password: '',
  });
  const [isSigningOut, setIsSigningOut] = useState(false);

  // No auto-redirect - use render gating instead

  // If already signed in, don't render this page (prevents getting stuck on /login).
  React.useEffect(() => {
    if (!authLoaded) return;
    if (isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoaded, isSignedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!isLoaded || !signIn) {
        throw new Error('Clerk not loaded');
      }

      const result = await signIn.create({
        strategy: 'password',
        identifier: formData.email,
        password: formData.password,
      });

      const activateSession = async (sessionId: string | null) => {
        try {
          await setActive({ session: sessionId });
          navigate('/dashboard');
        } catch (setActiveError: any) {
          console.error('Session activation failed:', setActiveError);
          setError(t('auth:errors.sessionActivationFailed'));
        }
      };

      if (result.status === 'complete') {
        await activateSession(result.createdSessionId);
      } else if (result.status === 'needs_first_factor') {
        const firstFactorResult = await signIn.attemptFirstFactor({
          strategy: 'password',
          password: formData.password,
        });

        if (firstFactorResult.status === 'complete') {
          await activateSession(firstFactorResult.createdSessionId);
        } else if (firstFactorResult.status === 'needs_second_factor') {
          setError(t('auth:errors.twoFactorRequired'));
        } else {
          setError(t('auth:errors.twoFactorRequired'));
        }
      } else if (result.status === 'needs_second_factor') {
        setError(t('auth:errors.twoFactorRequired'));
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      
      // Parse Clerk error messages for better user experience
      let errorMessage = t('auth:errors.genericLogin');
      
      if (err.errors && err.errors.length > 0) {
        const error = err.errors[0];
        switch (error.code) {
          case 'form_password_incorrect':
            errorMessage = t('auth:errors.incorrectPassword');
            break;
          case 'form_identifier_not_found':
            errorMessage = t('auth:errors.accountNotFound');
            break;
          case 'form_identifier_exists':
            errorMessage = t('auth:errors.accountExists');
            break;
          case 'form_password_pwned':
            errorMessage = t('auth:errors.passwordBreached');
            break;
          case 'form_password_not_strong_enough':
            errorMessage = t('auth:errors.passwordNotStrong');
            break;
          case 'form_password_validation_failed':
            errorMessage = t('auth:errors.passwordRequirements');
            break;
          case 'form_identifier_invalid':
            errorMessage = t('auth:errors.invalidEmail');
            break;
          case 'session_exists':
            errorMessage = t('auth:errors.sessionExists');
            break;
          default:
            errorMessage = error.message || t('auth:errors.invalidCredentials');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) {
      return;
    }

    setIsLoading(true);

    try {
      // OAuth completes via a full page load (server request). Redirecting to a deep SPA
      // route like `/dashboard` can 404 in environments without an index.html rewrite.
      // Redirect to the app base URL and let the client router handle post-login navigation.
      // Use full URL for redirects (Clerk v5 requirement).
      const redirectUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
      
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: redirectUrl,
        redirectUrlComplete: redirectUrl,
      });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      const errorMessage = error.errors?.[0]?.message || t('auth:errors.googleSignInFailed');
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Navigate to homepage after sign out
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const updateFormData = (field: keyof AdminLoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // STRICT RENDERING GATES - Wait for Clerk to load before showing anything
  if (!isLoaded || !authLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-swiss-mint mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // SCENARIO A: Already signed in when landing on /login
  // Show "Active Session" UI - let user choose to go to dashboard or sign out
  if (isSignedIn && user) {
    return (
      <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          {getAdminLogo(settings) ? (
            <img 
              src={getAdminLogo(settings)!} 
              alt={t('common:adminlogo')} 
              className="h-[92px] w-auto mx-auto mb-3"
            />
          ) : (
            <SquaresPlusIcon className="h-16 w-16 text-swiss-mint mx-auto mb-3" />
          )}
        </div>

        <div className="space-y-6">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon className="w-16 h-16 text-swiss-mint" />
            </div>
            <h2 className="text-2xl font-bold text-swiss-charcoal text-center">
              {t('auth:activeSession.title')}
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 text-center">
                <strong>{t('auth:activeSession.welcomeBack', { name: user.fullName || user.firstName || t('common:admin') })}</strong>
              </p>
              <p className="text-xs text-blue-700 text-center mt-2">
                {t('auth:activeSession.alreadyLoggedIn')}
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                {t('auth:activeSession.goToDashboard')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? t('auth:activeSession.signingOut') : t('common:buttons.signOut')}
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              {t('auth:securedByClerk')}
            </p>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            {t('auth:copyright')}
          </p>
        </div>
      </div>
    );
  }

  // SCENARIO B: Not signed in - Show login form
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          {getAdminLogo(settings) ? (
            <img 
              src={getAdminLogo(settings)!} 
              alt={t('common:adminlogo')} 
              className="h-[92px] w-auto mx-auto mb-3"
            />
          ) : (
            <SquaresPlusIcon className="h-16 w-16 text-swiss-mint mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-swiss-charcoal">{t('admin:auth.login.title')}</h1>
          <p className="text-sm text-gray-500">{t('admin:auth.login.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:auth.login.emailLabel')}
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              required
              placeholder={t('admin:auth.login.emailPlaceholder')}
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:auth.login.passwordLabel')}
                </label>
                <Link
                  to={formData.email ? `/reset-password?email=${encodeURIComponent(formData.email)}` : '/reset-password'}
                  className="text-xs text-swiss-mint hover:underline"
                >
                  {t('admin:auth.login.forgotPassword')}
                </Link>
            </div>
            <div className="relative">
                <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                placeholder={t('common:placeholders.enteryourpassword')}
                />
                 <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                    aria-label={showPassword ? t('admin:auth.login.hidePassword') : t('admin:auth.login.showPassword')}
                >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                </button>
            </div>
          </div>
          <div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth:login.signingIn') : t('common:buttons.signIn')}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('auth:login.orContinueWith')}</span>
            </div>
          </div>

          <div className="mt-4">
            <Button variant="light" onClick={handleGoogleSignIn} className="w-full" disabled={isLoading}>
              <GoogleIcon className="w-5 h-5 mr-2" /> {t('auth:login.continueWithGoogle')}
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            {t('auth:securedByClerk')}
          </p>
        </div>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          {t('auth:copyright')}
        </p>
      </div>
    </div>
  );
}