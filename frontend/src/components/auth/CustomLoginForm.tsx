import React, { useState, useEffect } from 'react';
import { useSignIn, useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

export default function CustomLoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, isLoaded } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user, isAuthenticated } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoaded && isSignedIn && isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoaded, isSignedIn, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!isLoaded || !signIn) {
        throw new Error('Clerk not loaded');
      }

      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      });

      if (result.status === 'complete') {
        // User signed in successfully, redirect to dashboard
        navigate('/dashboard');
      } else if (result.status === 'needs_first_factor') {
        // Handle 2FA if needed
        setError('Two-factor authentication required');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Parse Clerk error messages for better user experience
      let errorMessage = 'An error occurred during login';
      
      if (err.errors && err.errors.length > 0) {
        const error = err.errors[0];
        switch (error.code) {
          case 'form_password_incorrect':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'form_identifier_not_found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'form_identifier_exists':
            errorMessage = 'An account with this email already exists.';
            break;
          case 'form_password_pwned':
            errorMessage = 'This password has been found in a data breach. Please choose a different password.';
            break;
          case 'form_password_not_strong_enough':
            errorMessage = 'Password is not strong enough.';
            break;
          case 'form_password_validation_failed':
            errorMessage = 'Password does not meet requirements.';
            break;
          case 'form_identifier_invalid':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'session_exists':
            errorMessage = 'You are already signed in. Redirecting...';
            break;
          default:
            errorMessage = error.message || 'Invalid email or password';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isLoaded || !authLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // Show message if user is already authenticated but not redirected yet
  if (isSignedIn && user) {
    return (
      <div className="min-h-screen frontend-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto h-1 w-16 bg-swiss-mint rounded-full mb-6"></div>
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-swiss-light border border-swiss-mint/20 mb-6">
              <span className="text-2xl font-bold text-swiss-mint">PC</span>
            </div>
            <h1 className="text-3xl font-bold text-swiss-charcoal font-swiss">
              Already Logged In
            </h1>
            <p className="mt-3 text-swiss-gray font-medium">
              Welcome back, {user.name || user.email}!
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary w-full py-3 text-base font-semibold"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Swiss Modern Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Swiss accent stripe */}
          <div className="mx-auto h-1 w-16 bg-swiss-mint rounded-full mb-6"></div>
          
          {/* Logo placeholder */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-swiss-light border border-swiss-mint/20 mb-6">
            <span className="text-2xl font-bold text-swiss-mint">PC</span>
          </div>
          
          <h1 className="text-3xl font-bold text-swiss-charcoal font-swiss">
            {t('auth:loginPage.title')}
          </h1>
          <p className="mt-3 text-swiss-gray font-medium">
            {t('auth:loginPage.subtitle')}
          </p>
        </div>
      </div>

      {/* Swiss Modern Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-swiss py-8 px-6 sm:px-10 relative">
          {/* Swiss corner notch */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-swiss-mint rounded-bl-md"></div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-card bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-swiss-charcoal mb-2">
                {t('auth:loginPage.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="input-field"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-swiss-charcoal mb-2">
                {t('auth:loginPage.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="input-field"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="/forgot-password" className="font-medium text-swiss-teal hover:text-swiss-mint transition-colors">
                  {t('auth:loginPage.forgotPassword')}
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-base font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('common:loading')}
                  </div>
                ) : (
                  t('auth:loginPage.signIn')
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm text-swiss-gray">
                {t('auth:loginPage.noAccount')}{' '}
                <a href="/signup" className="font-semibold text-swiss-teal hover:text-swiss-mint transition-colors">
                  {t('auth:loginPage.signUp')}
                </a>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}