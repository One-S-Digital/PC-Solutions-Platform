import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignIn } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { STANDARD_INPUT_FIELD, APP_NAME } from '../constants';
import { EyeIcon, EyeSlashIcon, SquaresPlusIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import HelpModal from '../components/help/HelpModal';
import LogoLink from '../components/shared/LogoLink';
import { useFrontendSettings } from '../hooks/useFrontendSettings';

type Step = 'request' | 'verify';

function getClerkErrorMessage(err: any): string | null {
  const first = err?.errors?.[0];
  if (first?.longMessage) return String(first.longMessage);
  if (first?.message) return String(first.message);
  if (typeof err?.message === 'string') return err.message;
  return null;
}

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signIn, isLoaded: isSignInLoaded, setActive } = useSignIn();
  const { settings, loading: settingsLoading } = useFrontendSettings();

  const queryEmail = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get('email') || '';
    } catch {
      return '';
    }
  }, [location.search]);

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const logoUrl = settings?.logoAsset?.publicUrl;
  const showLogoFallback = !settingsLoading && !logoUrl;

  useEffect(() => {
    if (queryEmail && !email) setEmail(queryEmail);
    // only seed once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryEmail]);

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthLoaded, isSignedIn, navigate]);

  if (!isSignInLoaded || !isAuthLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email) {
      setError(t('common:forms.required', 'This field is required'));
      return;
    }

    if (!signIn) {
      setError(t('common:loginPage.authServiceNotReady', 'Authentication service not ready. Please try again.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep('verify');
      setInfo(t('common:verifyEmailMessage', 'We sent you a 6-digit code. Enter it below to verify.'));
    } catch (err: any) {
      console.error('Password reset request failed:', err);
      setError(getClerkErrorMessage(err) || t('common:errors.unknown', 'An unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!code) {
      setError(t('common:forms.required', 'This field is required'));
      return;
    }
    if (!password) {
      setError(t('common:forms.required', 'This field is required'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('common:forms.passwordsDoNotMatch', 'Passwords do not match'));
      return;
    }

    if (!signIn) {
      setError(t('common:loginPage.authServiceNotReady', 'Authentication service not ready. Please try again.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      // Clerk typically returns `needs_new_password` here.
      if (attempt.status === 'needs_new_password' || signIn.status === 'needs_new_password') {
        const resetAttempt = await signIn.resetPassword({ password });
        if (resetAttempt.status === 'complete') {
          await setActive({ session: resetAttempt.createdSessionId });
          navigate('/dashboard', { replace: true });
          return;
        }
        setError(t('common:errors.unknown', 'An unknown error occurred'));
        return;
      }

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        navigate('/dashboard', { replace: true });
        return;
      }

      setError(
        t(
          'common:errors.unknown',
          'An unknown error occurred'
        )
      );
    } catch (err: any) {
      console.error('Password reset verification failed:', err);
      setError(getClerkErrorMessage(err) || t('common:errors.unknown', 'An unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setInfo('');
    if (!signIn) {
      setError(t('common:loginPage.authServiceNotReady', 'Authentication service not ready. Please try again.'));
      return;
    }
    if (!email) {
      setError(t('common:forms.required', 'This field is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setInfo(t('common:verificationCodeResent', 'A new verification code has been sent.'));
    } catch (err: any) {
      console.error('Resend reset code failed:', err);
      setError(getClerkErrorMessage(err) || t('common:errors.unknown', 'An unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6">
      <Card className="w-full max-w-md p-3 sm:p-4 md:p-6 shadow-xl">
        <div className="text-center mb-3 sm:mb-4 md:mb-5">
          <LogoLink
            to="/login"
            ariaLabel={t('common:buttons.goToLogin', 'Go to Login')}
            logoUrl={logoUrl}
            altText={settings?.siteName || APP_NAME}
            showFallback={showLogoFallback}
            imageClassName="h-12 sm:h-14 md:h-[72px] w-auto mx-auto mb-1.5 sm:mb-2"
            iconClassName="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-swiss-mint mx-auto mb-1.5 sm:mb-2"
            fallbackIcon={SquaresPlusIcon}
          />
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-swiss-charcoal">
            {t('common:resetPassword', 'Reset Password')}
          </h1>
          <p className="text-xs text-gray-500">
            {step === 'request'
              ? t('auth:forgotPassword', 'Forgot your password?')
              : t('common:labels.verificationCode', 'Verification Code')}
          </p>
        </div>

        {error && (
          <div className="mb-2 sm:mb-3 p-2 bg-red-100 text-red-700 rounded-md text-xs sm:text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-2 sm:mb-3 p-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-xs sm:text-sm">
            {info}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:loginPage.emailLabel', 'Email Address')}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                placeholder={t('common:loginPage.emailPlaceholder', 'Enter your email')}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('common:buttons.sending', 'Sending...') : t('common:buttons.continue', 'Continue')}
            </Button>
            <div className="text-center text-xs text-gray-600">
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                {t('common:buttons.goToLogin', 'Go to Login')}
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndReset} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:labels.verificationCode', 'Verification Code')}
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('common:settingsAccountSecurity.changeEmail.verificationCodePlaceholder', 'Enter 6-digit code')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth:resetPassword', 'Reset Password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  required
                  autoComplete="new-password"
                  placeholder={t('common:settingsAccountSecurity.changePassword.newPasswordLabel', 'New Password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                  aria-label={showPassword ? t('common:hidePassword', 'Hide password') : t('common:showPassword', 'Show password')}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:confirmPassword', 'Confirm Password')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  required
                  autoComplete="new-password"
                  placeholder={t('common:confirmPassword', 'Confirm Password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                  aria-label={
                    showConfirmPassword ? t('common:hidePassword', 'Hide password') : t('common:showPassword', 'Show password')
                  }
                >
                  {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('common:buttons.saving', 'Saving') : t('common:buttons.resetPassword', 'Reset Password')}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-swiss-mint hover:underline disabled:opacity-60"
                onClick={handleResendCode}
                disabled={isSubmitting}
              >
                {t('common:buttons.resendCode', 'Resend code')}
              </button>
              <Link to="/login" className="text-gray-600 hover:underline">
                {t('common:buttons.goToLogin', 'Go to Login')}
              </Link>
            </div>
          </form>
        )}

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

export default ResetPasswordPage;

