import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignIn } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import { STANDARD_INPUT_FIELD } from '../constants/design-system';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

type Step = 'request' | 'verify';

function getClerkErrorMessage(err: any): string | null {
  const first = err?.errors?.[0];
  if (first?.longMessage) return String(first.longMessage);
  if (first?.message) return String(first.message);
  if (typeof err?.message === 'string') return err.message;
  return null;
}

export default function ResetPassword() {
  const { t } = useTranslation(['auth', 'common', 'admin']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signIn, isLoaded: isSignInLoaded, setActive } = useSignIn();

  const queryEmail = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get('email') || '';
    } catch {
      return '';
    }
  }, [location.search]);

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(queryEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setError(null);
    setInfo(null);

    if (!email) {
      setError(t('common:forms.required', 'This field is required'));
      return;
    }
    if (!signIn) {
      setError(t('common:errors.unknown', 'An unknown error occurred'));
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
      console.error('Admin password reset request failed:', err);
      setError(getClerkErrorMessage(err) || t('common:errors.unknown', 'An unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

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
      setError(t('common:errors.unknown', 'An unknown error occurred'));
      return;
    }

    setIsSubmitting(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

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

      setError(t('common:errors.unknown', 'An unknown error occurred'));
    } catch (err: any) {
      console.error('Admin password reset failed:', err);
      setError(getClerkErrorMessage(err) || t('common:errors.unknown', 'An unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-swiss-charcoal">{t('common:resetPassword', 'Reset Password')}</h1>
          <p className="text-sm text-gray-500">
            {step === 'request'
              ? t('admin:auth.login.forgotPassword', 'Forgot Password')
              : t('common:labels.verificationCode', 'Verification Code')}
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        {info && <div className="mb-4 p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-sm">{info}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:auth.login.emailLabel', 'Email Address')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:auth.login.emailPlaceholder', 'Enter your email')}
                required
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('common:buttons.sending', 'Sending...') : t('common:buttons.continue', 'Continue')}
            </Button>
            <div className="text-center text-xs text-gray-600">
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                {t('common:buttons.goToLogin', 'Go to Login')}
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndReset} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:labels.verificationCode', 'Verification Code')}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('common:settingsAccountSecurity.changeEmail.verificationCodePlaceholder', 'Enter 6-digit code')}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:buttons.resetPassword', 'Reset Password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('common:settingsAccountSecurity.changePassword.newPasswordLabel', 'New Password')}
                  required
                  autoComplete="new-password"
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
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('common:confirmPassword', 'Confirm Password')}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                  aria-label={showConfirmPassword ? t('common:hidePassword', 'Hide password') : t('common:showPassword', 'Show password')}
                >
                  {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('common:buttons.saving', 'Saving') : t('common:buttons.resetPassword', 'Reset Password')}
            </Button>
            <div className="text-center text-xs text-gray-600">
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                {t('common:buttons.goToLogin', 'Go to Login')}
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

