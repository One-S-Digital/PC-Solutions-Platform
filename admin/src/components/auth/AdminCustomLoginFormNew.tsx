import React, { useState, useEffect } from 'react';
import { useSignIn, useAuth, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { SquaresPlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useSettings } from '../../hooks/useSettings';
import Card from '../design-system/Card';
import Button from '../design-system/Button';
import { STANDARD_INPUT_FIELD } from '../../constants/design-system';

interface AdminLoginFormData {
  email: string;
  password: string;
}

// Mock social icons
const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
);

export default function AdminCustomLoginForm() {
  const { t } = useTranslation();
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

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoaded && isSignedIn && user) {
      navigate('/dashboard');
    }
  }, [authLoaded, isSignedIn, user, navigate]);

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
        // User signed in successfully, activate session and redirect to admin dashboard
        try {
          await setActive({ session: result.createdSessionId });
          navigate('/dashboard');
        } catch (setActiveError: any) {
          console.error('Session activation failed:', setActiveError);
          setError('Failed to activate session. Please try again.');
        }
      } else if (result.status === 'needs_first_factor') {
        // Handle 2FA if needed
        setError('Two-factor authentication required');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      
      // Parse Clerk error messages for better user experience
      let errorMessage = 'An error occurred during login';
      
      if (err.errors && err.errors.length > 0) {
        const error = err.errors[0];
        switch (error.code) {
          case 'form_password_incorrect':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'form_identifier_not_found':
            errorMessage = 'No admin account found with this email address.';
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

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) {
      return;
    }

    setIsLoading(true);

    try {
      // Use full URL for redirects (Clerk v5 requirement)
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: redirectUrl,
        redirectUrlComplete: redirectUrl,
      });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      const errorMessage = error.errors?.[0]?.message || 'Google sign in failed. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof AdminLoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Get the admin logo URL or fallback to shield icon
  const getAdminLogo = () => {
    if (settings?.adminLogoAsset?.url) {
      return settings.adminLogoAsset.url;
    }
    return null;
  };

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

  // Show message if user is already authenticated but not redirected yet
  if (isSignedIn && user) {
    return (
      <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-swiss-mint rounded-full flex items-center justify-center mb-6">
              {getAdminLogo() ? (
                <img 
                  src={getAdminLogo()} 
                  alt="Admin Logo" 
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <SquaresPlusIcon className="h-8 w-8 text-white" />
              )}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-swiss-charcoal">
              Already Logged In
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Welcome back, {user.fullName || user.emailAddresses[0]?.emailAddress}!
            </p>
            <div className="mt-6">
              <Link to="/dashboard">
                <Button variant="primary" size="lg" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Pro Crèche Solutions Management Portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              required
              placeholder="admin@procreche.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <a href="#/password-reset" onClick={(e) => {e.preventDefault(); alert('Password reset functionality TBD');}} className="text-xs text-swiss-mint hover:underline">
                    Forgot Password?
                </a>
            </div>
            <div className="relative">
                <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                placeholder="Enter your password"
                />
                 <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                </button>
            </div>
          </div>
          <div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-4">
            <Button variant="light" onClick={handleGoogleSignIn} className="w-full" disabled={isLoading}>
              <GoogleIcon className="w-5 h-5 mr-2" /> Continue with Google
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Admin access required - Secured by Clerk
          </p>
        </div>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 Pro Crèche Solutions. All rights reserved.
        </p>
      </div>
    </div>
  );
}