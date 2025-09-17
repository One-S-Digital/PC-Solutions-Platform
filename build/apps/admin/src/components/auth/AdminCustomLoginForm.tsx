import React, { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface AdminLoginFormData {
  email: string;
  password: string;
}

export default function AdminCustomLoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, isLoaded } = useSignIn();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdminLoginFormData>({
    email: '',
    password: '',
  });

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
        navigate('/admin/dashboard');
      } else if (result.status === 'needs_first_factor') {
        // Handle 2FA if needed
        setError('Two-factor authentication required');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof AdminLoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Swiss Modern Admin Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Swiss accent stripe - Admin version */}
          <div className="mx-auto h-1 w-16 bg-admin-mint rounded-full mb-6"></div>
          
          {/* Admin Logo */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-admin-light border border-admin-mint/20 mb-6">
            <span className="text-2xl">🛡️</span>
          </div>
          
          <h1 className="text-3xl font-bold text-admin-charcoal font-swiss">
            Admin Portal Login
          </h1>
          <p className="mt-3 text-admin-gray font-medium">
            Sign in to access the admin dashboard
          </p>
        </div>
      </div>

      {/* Swiss Modern Admin Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-swiss py-8 px-6 sm:px-10 relative border-l-4 border-admin-mint">
          {/* Swiss corner notch - Admin version */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-admin-mint rounded-bl-md"></div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-card bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-admin-charcoal mb-2">
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
                placeholder="Enter your admin email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-admin-charcoal mb-2">
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
                <a href="/admin/forgot-password" className="font-medium text-admin-teal hover:text-admin-mint transition-colors">
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
                  'Sign In to Admin Portal'
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm text-admin-gray">
                {t('auth:loginPage.noAccount')}{' '}
                <a href="/admin/signup" className="font-semibold text-admin-teal hover:text-admin-mint transition-colors">
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