import React, { useState, useEffect } from 'react';
import { useSignIn, useAuth, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminLoginFormData {
  email: string;
  password: string;
}

export default function AdminCustomLoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, isLoaded } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  
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
        // User signed in successfully, redirect to admin dashboard
        navigate('/dashboard');
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
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard',
      });
    } catch (error: unknown) {
      console.error('Google sign in error:', error);
      toast.error('Google sign in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof AdminLoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isLoaded || !authLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // Show message if user is already authenticated but not redirected yet
  if (isSignedIn && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Already Logged In
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Welcome back, {user.fullName || user.emailAddresses[0]?.emailAddress}!
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Pro Crèche Solutions Management Portal
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="admin@procreche.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
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

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-6 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Admin access required - Secured by Clerk
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 Pro Crèche Solutions. All rights reserved.
        </p>
      </div>
    </div>
  );
}