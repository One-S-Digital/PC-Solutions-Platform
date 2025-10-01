import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/hooks/useAuth';
import { APP_NAME } from '../constants';
import { SquaresPlusIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(formData);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md p-8 shadow-xl bg-white rounded-lg">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">
            {t('loginPage.title', { appName: APP_NAME })}
          </h1>
          <p className="text-sm text-gray-500">{t('loginPage.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('loginPage.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
              placeholder={t('loginPage.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('loginPage.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
              placeholder={t('loginPage.passwordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-swiss-mint hover:bg-swiss-mint-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('loginPage.signIn')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <a href="/signup" className="font-medium text-swiss-mint hover:text-swiss-blue">
            {t('loginPage.createAccount')}
          </a>
        </div>
        
        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;