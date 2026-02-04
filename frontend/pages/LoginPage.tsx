import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSignIn, useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { STANDARD_INPUT_FIELD, APP_NAME } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SquaresPlusIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, HomeIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import HelpModal from '../components/help/HelpModal';
import { useAppContext } from '../contexts/AppContext';
import { useAuthContext } from '../providers/AuthProvider';
import { useFrontendSettings } from '../hooks/useFrontendSettings';
import { getHomePath } from '../utils/navigation';
import LogoLink from '../components/shared/LogoLink';

// Social icons
const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
    <path d="M1 1h22v22H1z" fill="none"></path>
  </svg>
);

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoaded: isSignInLoaded, setActive } = useSignIn();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { currentUser } = useAppContext();
  const { isLoading: isAuthLoading, authError, clearAuthError, logout, isSigningOut: isSigningOutGlobal } = useAuthContext();
  const { settings, loading: settingsLoading, error: settingsError } = useFrontendSettings();
  const homePath = getHomePath(currentUser);
  const logoUrl = settings?.logoAsset?.publicUrl;
  const showLogoFallback = !settingsLoading && !logoUrl;
  
  useEffect(() => {
    if (settingsError) {
      console.warn('Failed to load frontend settings:', settingsError);
    }
  }, [settingsError]);

  // If a user is already signed in, don't keep them stuck on /login.
  // This can happen after OAuth completes, or when a signed-in user refreshes /login.
  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isSignedIn) return;

    // If backend user exists, go to dashboard. Otherwise, route to signup to complete profile.
    if (currentUser) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Avoid redirecting while the backend sync is still loading or during sign-out.
    if (isAuthLoading || isSigningOutGlobal) return;

    navigate('/signup', { replace: true, state: { from: location, isPending: true } });
  }, [isAuthLoaded, isSignedIn, currentUser, isAuthLoading, isSigningOutGlobal, navigate, location]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem('auth_block_message');
      if (msg) {
        sessionStorage.removeItem('auth_block_message');
        setError(msg);
      }
    } catch {
      // ignore
    }
  }, []);

  // No auto-redirects or side effects needed.
  // Rendering is purely driven by isLoaded and isSignedIn state.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearAuthError();

    if (!email || !password) {
      setError(t('common:loginPage.errorBothFields'));
      return;
    }

    if (isSignedIn) {
      setError(t('common:loginPage.sessionAlreadyActive'));
      return;
    }

    if (!isSignInLoaded || !signIn) {
      setError(t('common:loginPage.authServiceNotReady'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        try {
          // Immediately activate session and navigate - no re-render in between
          await setActive({ session: result.createdSessionId });
          
          // Navigate immediately - proper render gating prevents Active Session UI from showing
          navigate('/dashboard', { replace: true });
        } catch (setActiveError: any) {
          console.error('Session activation failed:', setActiveError);
          setError(t('common:loginPage.sessionActivationFailed'));
        }
      } else if (result.status === 'needs_first_factor') {
        setError(t('common:loginPage.twoFactorRequired'));
      } else {
        setError(t('common:loginPage.loginIncomplete'));
      }
    } catch (err: any) {
      console.error('Login error:', err);

      let errorMessage = t('common:errors.unknown');
      let errorCode = 'unknown';

      if (err.errors && err.errors.length > 0) {
        const clerkError = err.errors[0];
        errorCode = clerkError.code;
        switch (clerkError.code) {
          case 'form_password_incorrect':
            errorMessage = t('common:loginPage.incorrectPassword', 'Incorrect password. Please try again.');
            break;
          case 'form_identifier_not_found':
            errorMessage = t('common:loginPage.accountNotFound', 'No account found with this email address.');
            break;
          case 'form_identifier_invalid':
            errorMessage = t('common:loginPage.invalidEmail', 'Please enter a valid email address.');
            break;
          case 'session_exists':
            errorMessage = t('common:loginPage.sessionAlreadyActive');
            break;
          default:
            errorMessage = clerkError.message || t('common:errors.unknown');
        }
      } else if (err.message) {
        if (err.message.toLowerCase().includes('already signed in')) {
          errorMessage = t('common:loginPage.sessionAlreadyActive');
          errorCode = 'session_exists';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'oauth_google') => {
    if (isSignedIn) {
      setError(t('common:loginPage.sessionAlreadyActive'));
      return;
    }

    if (!isSignInLoaded || !signIn) {
      setError(t('common:loginPage.authServiceNotReady'));
      return;
    }

    try {
      // OAuth completes via a full page load (server request). Redirecting to a deep SPA
      // route like `/dashboard` can 404 in environments without an index.html rewrite.
      // Redirect to the app base URL and let the client router handle post-login navigation.
      // Use full URL for redirects (Clerk v5 requirement).
      const redirectUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
      
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: redirectUrl,
        redirectUrlComplete: redirectUrl,
      });
    } catch (error: any) {
      console.error('Social login error:', error);
      const errorMessage = error.errors?.[0]?.message || t('common:loginPage.socialLoginFailed');
      setError(errorMessage);
    }
  };

  const handleLogout = async () => {
    setError('');
    clearAuthError();
    setIsSigningOut(true);

    try {
      await logout();
    } catch (error) {
      console.error('Logout error from login page:', error);
      setError(t('common:loginPage.signOutFailed'));
    } finally {
      setIsSigningOut(false);
    }
  };

  // STRICT RENDERING GATES - Wait for Clerk to load before showing anything
  if (!isSignInLoaded || !isAuthLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  // SCENARIO A: Already signed in when landing on /login
  // Show "Active Session" UI - let user choose to go to dashboard or sign out
  if (isSignedIn && currentUser) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  // Show loading state during sign-out to prevent flash of error screen
  // Use global isSigningOut from AuthProvider to catch sign-out from any page
  if (isSigningOut || isSigningOutGlobal) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  // SCENARIO B: Signed in to Clerk but no backend profile
  // This typically means a new user signed up via OAuth (Google) and needs to complete their profile
  // Redirect them to signup page to select a role and complete registration
  if (isSignedIn && !currentUser && !isAuthLoading && !isSigningOut && !isSigningOutGlobal) {
    return (
      <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6">
        <Card className="w-full max-w-md p-3 sm:p-4 md:p-6 shadow-xl">
          <div className="text-center mb-3 sm:mb-4 md:mb-5">
            <LogoLink
              to={homePath}
              ariaLabel={t('common:buttons.goHome', 'Go to home')}
              logoUrl={logoUrl}
              altText={settings?.siteName || APP_NAME}
              showFallback={showLogoFallback}
              imageClassName="h-12 sm:h-14 md:h-[72px] w-auto mx-auto mb-1.5 sm:mb-2"
              iconClassName="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-swiss-mint mx-auto mb-1.5 sm:mb-2"
              fallbackIcon={SquaresPlusIcon}
            />
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-swiss-charcoal">
              {t('common:loginPage.completeRegistration', 'Complete Your Registration')}
            </h1>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 mb-1.5">
                <strong>{t('common:loginPage.almostThere', 'Almost there!')}</strong>
              </p>
              <p className="text-xs text-blue-700">
                {t('common:loginPage.completeProfileMessage', 'You\'re signed in with Google. To finish setting up your account, please select a role and complete your profile.')}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => navigate('/signup', { replace: true, state: { fromOAuth: true } })}
              >
                {t('common:loginPage.completeProfile', 'Complete Profile')}
              </Button>
              <Button
                type="button"
                variant="light"
                className="w-full"
                onClick={handleLogout}
                disabled={isSigningOut}
              >
                {isSigningOut
                  ? t('common:loginPage.signingOut', 'Signing Out...')
                  : t('common:loginPage.useAnotherAccount', 'Use Another Account')}
              </Button>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex justify-center items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 transition-colors"
              aria-label={t('common:navbar.help')}
              title={t('common:navbar.help')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </Card>
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      </div>
    );
  }

  // SCENARIO C: Not signed in - Show login form
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6">
      <Card className="w-full max-w-md p-3 sm:p-4 md:p-6 shadow-xl">
        <div className="text-center mb-3 sm:mb-4 md:mb-5">
          <LogoLink
            to={homePath}
            ariaLabel={t('common:buttons.goHome', 'Go to home')}
            logoUrl={logoUrl}
            altText={settings?.siteName || APP_NAME}
            showFallback={showLogoFallback}
            imageClassName="h-12 sm:h-14 md:h-[72px] w-auto mx-auto mb-1.5 sm:mb-2"
            iconClassName="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-swiss-mint mx-auto mb-1.5 sm:mb-2"
            fallbackIcon={SquaresPlusIcon}
          />
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-swiss-charcoal">
            {t('common:loginPage.title', { appName: settings?.siteName || APP_NAME })}
          </h1>
          <p className="text-xs text-gray-500">{t('common:loginPage.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-2 sm:mb-3 p-2 bg-red-100 text-red-700 rounded-md text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Login Form - Only rendered when NOT signed in */}
        <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common:loginPage.emailLabel')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  required
                  placeholder={t('common:loginPage.emailPlaceholder')}
                />
              </div>

              <div>
                <div className="flex justify-between items-baseline">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common:loginPage.passwordLabel')}
                  </label>
                  <Link
                    to={email ? `/reset-password?email=${encodeURIComponent(email)}` : '/reset-password'}
                    className="text-xs text-swiss-mint hover:underline"
                  >
                    {t('common:loginPage.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    required
                    placeholder={t('common:loginPage.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                    aria-label={showPassword ? t('common:hidePassword') : t('common:showPassword')}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('common:loginPage.loggingIn') : t('common:buttons.login')}
              </Button>
            </form>

            <div className="mt-3 sm:mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">
                    {t('common:loginPage.orContinueWith')}
                  </span>
                </div>
              </div>

              <div className="mt-2 sm:mt-3">
                <Button
                  variant="light"
                  onClick={() => handleSocialLogin('oauth_google')}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> {t('common:loginPage.google')}
                </Button>
              </div>
            </div>

        <div className="mt-3 sm:mt-4 md:mt-5 text-center text-xs text-gray-600 space-y-1.5">
          <p>
            {t('common:loginPage.noAccount')}{' '}
            <Link to="/signup" className="font-medium text-swiss-mint hover:underline">
              {t('common:buttons.signup')}
            </Link>
          </p>
          <p>
            {t('common:loginPage.viewPlansPrompt')}{' '}
            <Link to="/pricing" className="font-medium text-swiss-mint hover:underline">
              {t('common:loginPage.viewPlans')}
            </Link>
          </p>
          <div className="border-t border-gray-200 pt-2 sm:pt-3 mt-2 sm:mt-3">
            <p className="text-xs text-gray-600 text-center mb-1.5 sm:mb-2">
              {t('common:loginPage.parentLookingForCreche')}
            </p>
              <div className="text-center">
                <Link 
                  to="/parent-lead-form" 
                  className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-swiss-teal font-medium rounded-md hover:bg-swiss-teal/5 transition-colors duration-200 border border-swiss-teal/20 hover:border-swiss-teal/40"
                >
                  <HomeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" aria-hidden="true" />
                  {t('common:loginPage.findCrecheHere')}
                </Link>
              </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex justify-center items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 transition-colors"
            aria-label={t('common:navbar.help')}
            title={t('common:navbar.help')}
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </Card>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};

export default LoginPage;
