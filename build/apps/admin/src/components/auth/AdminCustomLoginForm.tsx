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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">🛡️</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Portal Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border-l-4 border-red-500">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth:loginPage.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth:loginPage.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="/admin/forgot-password" className="font-medium text-red-600 hover:text-red-500">
                  {t('auth:loginPage.forgotPassword')}
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? t('common:loading') : 'Sign In to Admin Portal'}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                {t('auth:loginPage.noAccount')}{' '}
                <a href="/admin/signup" className="font-medium text-red-600 hover:text-red-500">
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